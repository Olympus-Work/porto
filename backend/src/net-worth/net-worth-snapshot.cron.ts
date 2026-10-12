import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { errorMessage } from '../common/error-message';
import { NetWorthService } from './net-worth.service';

@Injectable()
export class NetWorthSnapshotCron {
  private readonly logger = new Logger(NetWorthSnapshotCron.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly netWorthService: NetWorthService,
  ) {}

  // Snapshots otherwise only get recorded when the user presses Refresh, so the net-worth chart had no history.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recordDailySnapshots(): Promise<void> {
    const users = await this.userRepository.find({
      where: { isDemo: false },
      select: { id: true },
    });

    let ok = 0;
    for (const user of users) {
      try {
        await this.netWorthService.recordSnapshot(user.id);
        ok++;
      } catch (err) {
        this.logger.error(
          `Daily snapshot failed for user=${user.id}: ${errorMessage(err)}`,
        );
      }
    }

    this.logger.log(
      `Recorded daily net-worth snapshots: ${ok}/${users.length} user(s)`,
    );
  }
}
