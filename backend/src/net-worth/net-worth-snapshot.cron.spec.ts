import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NetWorthSnapshotCron } from './net-worth-snapshot.cron';
import { NetWorthService } from './net-worth.service';
import { User } from '../users/entities/user.entity';

describe('NetWorthSnapshotCron', () => {
  let cron: NetWorthSnapshotCron;
  let userRepository: { find: jest.Mock };
  let netWorthService: { recordSnapshot: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetWorthSnapshotCron,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: NetWorthService,
          useValue: {
            recordSnapshot: jest.fn(),
          },
        },
      ],
    }).compile();

    cron = module.get<NetWorthSnapshotCron>(NetWorthSnapshotCron);
    userRepository = module.get(getRepositoryToken(User));
    netWorthService = module.get(NetWorthService);
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  it('records a snapshot for every non-demo user', async () => {
    userRepository.find.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    netWorthService.recordSnapshot.mockResolvedValue(undefined);

    await cron.recordDailySnapshots();

    expect(userRepository.find).toHaveBeenCalledWith({
      where: { isDemo: false },
      select: { id: true },
    });
    expect(netWorthService.recordSnapshot).toHaveBeenCalledTimes(2);
    expect(netWorthService.recordSnapshot).toHaveBeenCalledWith('user-1');
    expect(netWorthService.recordSnapshot).toHaveBeenCalledWith('user-2');
  });

  it('continues to the next user when one snapshot fails', async () => {
    userRepository.find.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    netWorthService.recordSnapshot
      .mockRejectedValueOnce(new Error('price fetch failed'))
      .mockResolvedValueOnce(undefined);

    await expect(cron.recordDailySnapshots()).resolves.toBeUndefined();

    expect(netWorthService.recordSnapshot).toHaveBeenCalledWith('user-2');
  });
});
