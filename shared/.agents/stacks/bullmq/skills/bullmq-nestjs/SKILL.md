---
name: bullmq-nestjs
description: Background job queues with BullMQ in NestJS. Use when creating queues, defining job processors, scheduling recurring jobs, or handling failed jobs.
---

# BullMQ — NestJS

## Installation

```bash
npm install @nestjs/bullmq bullmq ioredis
```

## Module setup

```ts
// app.module.ts
import { BullModule } from '@nestjs/bullmq'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue(
      { name: 'emails' },
      { name: 'notifications' },
      { name: 'exports' },
    ),
  ],
})
export class AppModule {}
```

## Producer (adding jobs)

```ts
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('emails') private emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(userId: string, email: string) {
    await this.emailQueue.add(
      'welcome',
      { userId, email },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,  // keep last 100 completed
        removeOnFail: 500,
      },
    )
  }

  async scheduleReminder(userId: string, delay: number) {
    await this.emailQueue.add(
      'reminder',
      { userId },
      { delay },  // delay in ms
    )
  }
}
```

## Processor (consuming jobs)

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('emails')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name)

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'welcome':
        await this.handleWelcome(job)
        break
      case 'reminder':
        await this.handleReminder(job)
        break
      default:
        this.logger.warn(`Unknown job: ${job.name}`)
    }
  }

  private async handleWelcome(job: Job<{ userId: string; email: string }>) {
    const { userId, email } = job.data
    // send email...
    this.logger.log(`Welcome email sent to ${email}`)
  }

  private async handleReminder(job: Job<{ userId: string }>) {
    // send reminder...
  }
}
```

## Recurring jobs (cron)

```ts
// In module or service initialization
@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(@InjectQueue('exports') private exportsQueue: Queue) {}

  async onModuleInit() {
    // Remove existing repeatable job before adding (prevents duplicates on restart)
    await this.exportsQueue.removeRepeatable('daily-report', { cron: '0 8 * * *' })
    await this.exportsQueue.add(
      'daily-report',
      {},
      { repeat: { cron: '0 8 * * *' } },
    )
  }
}
```

## Job events

```ts
@Processor('emails')
export class EmailProcessor extends WorkerHost {
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`)
  }
}
```

## Module registration

```ts
// emails.module.ts
@Module({
  imports: [
    BullModule.registerQueue({ name: 'emails' }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailsModule {}
```

## Bull Board (dashboard)

```bash
npm install @bull-board/nestjs @bull-board/express
```

```ts
import { BullBoardModule } from '@bull-board/nestjs'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
BullBoardModule.forFeature({ name: 'emails', adapter: BullMQAdapter }),
```

## Anti-patterns

- Don't use `@nestjs/bull` (old) — use `@nestjs/bullmq` (BullMQ v2+)
- Don't skip `removeOnComplete`/`removeOnFail` — Redis memory will grow unbounded
- Don't add repeatable jobs without removing existing ones first — causes duplicates on restart
- Don't put large payloads in job data — store IDs and fetch data in the processor
