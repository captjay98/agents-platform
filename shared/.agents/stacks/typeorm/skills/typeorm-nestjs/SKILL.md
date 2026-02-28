---
name: typeorm-nestjs
description: TypeORM database integration in NestJS with PostgreSQL. Use when defining entities, repositories, migrations, relations, or query patterns.
---

# TypeORM — NestJS

## Installation

```bash
npm install @nestjs/typeorm typeorm pg
```

## Module setup

```ts
// app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,  // NEVER true in production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
  ],
})
export class AppModule {}
```

## Entity definition

```ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm'

@Entity('orders')
@Index(['userId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number

  @Column({ default: 'pending' })
  status: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[]
}
```

## Repository pattern

```ts
// orders.repository.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere } from 'typeorm'

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    return this.repo.findOne({ where: { id }, relations: ['items', 'user'] })
  }

  async findByUser(userId: string, status?: string): Promise<Order[]> {
    const where: FindOptionsWhere<Order> = { userId }
    if (status) where.status = status
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async create(data: Partial<Order>): Promise<Order> {
    const order = this.repo.create(data)
    return this.repo.save(order)
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    await this.repo.update(id, data)
    return this.findById(id) as Promise<Order>
  }

  async paginate(page: number, limit: number, where?: FindOptionsWhere<Order>) {
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }
}
```

## Transactions

```ts
import { DataSource } from 'typeorm'

@Injectable()
export class OrdersService {
  constructor(private dataSource: DataSource) {}

  async createOrderWithItems(dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, { userId: dto.userId, total: 0 })
      await manager.save(order)

      const items = dto.items.map((item) =>
        manager.create(OrderItem, { ...item, orderId: order.id }),
      )
      await manager.save(items)

      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      await manager.update(Order, order.id, { total })

      return manager.findOneOrFail(Order, { where: { id: order.id }, relations: ['items'] })
    })
  }
}
```

## Query builder (complex queries)

```ts
const orders = await this.repo
  .createQueryBuilder('order')
  .leftJoinAndSelect('order.items', 'item')
  .leftJoinAndSelect('order.user', 'user')
  .where('order.userId = :userId', { userId })
  .andWhere('order.status IN (:...statuses)', { statuses: ['pending', 'processing'] })
  .andWhere('order.createdAt >= :from', { from: startDate })
  .orderBy('order.createdAt', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount()
```

## Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate src/migrations/AddOrderStatus -d src/data-source.ts

# Run migrations
npx typeorm migration:run -d src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/data-source.ts
```

```ts
// data-source.ts (for CLI)
import { DataSource } from 'typeorm'

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
})
```

## Module registration

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
```

## Anti-patterns

- Never use `synchronize: true` in production — it can drop columns
- Don't use `find()` without `where` on large tables — always filter
- Don't load relations you don't need — use `select` to limit fields
- Don't use `save()` for updates — use `update()` to avoid loading the full entity
