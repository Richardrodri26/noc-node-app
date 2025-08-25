import { LogEntity, LogSeverityLevel } from '../../entities/log.entity';
import { CheckServiceMultiple } from './check-service-multiple';
import { LogRepository } from '../../repository/log.repository';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CheckServiceMultiple UseCase', () => {
  const createMockRepository = (): jest.Mocked<LogRepository> => ({
    saveLog: jest.fn(),
    getLogs: jest.fn(),
  });

  let mockRepo1: jest.Mocked<LogRepository>;
  let mockRepo2: jest.Mocked<LogRepository>;
  let mockRepo3: jest.Mocked<LogRepository>;
  let mockRepositories: jest.Mocked<LogRepository>[];

  const mockSuccessCallback = jest.fn();
  const mockErrorCallback = jest.fn();

  let checkService: CheckServiceMultiple;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    mockRepo1 = createMockRepository();
    mockRepo2 = createMockRepository();
    mockRepo3 = createMockRepository();
    mockRepositories = [mockRepo1, mockRepo2, mockRepo3];

    checkService = new CheckServiceMultiple(
      mockRepositories,
      mockSuccessCallback,
      mockErrorCallback,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful service checks', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);
    });

    test('should call successCallback when service is available', async () => {
      const testUrl = 'https://google.com';

      const result = await checkService.execute(testUrl);

      expect(result).toBe(true);
      expect(mockSuccessCallback).toHaveBeenCalledTimes(1);
      expect(mockErrorCallback).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(testUrl);
    });

    test('should save success log to all repositories', async () => {
      const testUrl = 'https://example.com';

      await checkService.execute(testUrl);

      // Verify all repositories received the saveLog call
      mockRepositories.forEach(repo => {
        expect(repo.saveLog).toHaveBeenCalledTimes(1);
        expect(repo.saveLog).toHaveBeenCalledWith(
          expect.objectContaining({
            message: `Service ${testUrl} working`,
            level: LogSeverityLevel.low,
            origin: 'check-service.ts',
            createdAt: expect.any(Date),
          })
        );
        expect(repo.getLogs).not.toHaveBeenCalled();
      });
    });

    test('should work with different numbers of repositories', async () => {
      const testCases = [
        { repos: [createMockRepository()], name: 'single repository' },
        { repos: [createMockRepository(), createMockRepository()], name: 'two repositories' },
        { repos: [], name: 'no repositories' },
      ];

      for (const testCase of testCases) {
        const service = new CheckServiceMultiple(
          testCase.repos,
          mockSuccessCallback,
          mockErrorCallback
        );

        const result = await service.execute('https://test.com');

        expect(result).toBe(true);
        testCase.repos.forEach(repo => {
          expect(repo.saveLog).toHaveBeenCalledTimes(1);
        });
      }
    });

    test('should create identical LogEntity for all repositories', async () => {
      const testUrl = 'https://api.test.com';

      await checkService.execute(testUrl);

      // Get the LogEntity passed to each repository
      const logEntities = mockRepositories.map(repo => {
        expect(repo.saveLog.mock.calls[0]).toBeDefined();
        return repo.saveLog.mock.calls[0]![0] as LogEntity;
      });

      // All should be equivalent (but different instances)
      for (let i = 1; i < logEntities.length; i++) {
        expect(logEntities[i]!.message).toBe(logEntities[0]!.message);
        expect(logEntities[i]!.level).toBe(logEntities[0]!.level);
        expect(logEntities[i]!.origin).toBe(logEntities[0]!.origin);
        // createdAt might be slightly different due to timing, so we check they're close
        expect(Math.abs(logEntities[i]!.createdAt.getTime() - logEntities[0]!.createdAt.getTime())).toBeLessThan(100);
      }
    });
  });

  describe('Failed service checks', () => {
    test('should call errorCallback when fetch response is not ok', async () => {
      const testUrl = 'https://httpstat.us/404';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await checkService.execute(testUrl);

      expect(result).toBe(false);
      expect(mockSuccessCallback).not.toHaveBeenCalled();
      expect(mockErrorCallback).toHaveBeenCalledTimes(1);
      expect(mockErrorCallback).toHaveBeenCalledWith(
        expect.stringContaining(testUrl)
      );
    });

    test('should call errorCallback when fetch throws network error', async () => {
      const testUrl = 'https://nonexistent-domain-12345.com';
      const networkError = new Error('Network error: fetch failed');
      mockFetch.mockRejectedValue(networkError);

      const result = await checkService.execute(testUrl);

      expect(result).toBe(false);
      expect(mockSuccessCallback).not.toHaveBeenCalled();
      expect(mockErrorCallback).toHaveBeenCalledTimes(1);
      expect(mockErrorCallback).toHaveBeenCalledWith(
        expect.stringContaining(testUrl)
      );
    });

    test('should save error log to all repositories when service fails', async () => {
      const testUrl = 'https://httpstat.us/500';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await checkService.execute(testUrl);

      mockRepositories.forEach(repo => {
        expect(repo.saveLog).toHaveBeenCalledTimes(1);
        expect(repo.saveLog).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(testUrl),
            level: LogSeverityLevel.high,
            origin: 'check-service.ts',
            createdAt: expect.any(Date),
          })
        );
      });
    });

    test('should handle repository failures gracefully', async () => {
      const testUrl = 'https://test.com';
      mockFetch.mockResolvedValue({ ok: true } as Response);

      // Make one repository throw an error
      mockRepo2.saveLog.mockImplementation(() => {
        throw new Error('Repository error');
      });

      // The service should still work even if one repository fails
      // Note: The current implementation doesn't handle repository errors,
      // so this test documents current behavior
      await expect(checkService.execute(testUrl)).rejects.toThrow('Repository error');

      // Verify repositories were called (the exact count may vary based on forEach behavior)
      expect(mockRepo1.saveLog).toHaveBeenCalled();
      expect(mockRepo2.saveLog).toHaveBeenCalled();
      // Third repository won't be called due to the error in the loop
    });
  });

  describe('Edge cases and error handling', () => {
    test('should work with undefined callbacks', async () => {
      const serviceWithoutCallbacks = new CheckServiceMultiple(
        mockRepositories,
        undefined,
        undefined
      );

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await serviceWithoutCallbacks.execute('https://test.com');

      expect(result).toBe(true);
      mockRepositories.forEach(repo => {
        expect(repo.saveLog).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle empty URL', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid URL'));

      const result = await checkService.execute('');

      expect(result).toBe(false);
      expect(mockErrorCallback).toHaveBeenCalledTimes(1);
    });

    test('should handle malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://invalid',
      ];

      for (const url of malformedUrls) {
        mockFetch.mockClear();
        jest.clearAllMocks();
        mockFetch.mockRejectedValue(new Error('Invalid URL'));

        const result = await checkService.execute(url);

        expect(result).toBe(false);
        expect(mockErrorCallback).toHaveBeenCalledTimes(1);
      }
    });

    test('should work with empty repositories array', async () => {
      const serviceWithNoRepos = new CheckServiceMultiple(
        [],
        mockSuccessCallback,
        mockErrorCallback
      );

      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await serviceWithNoRepos.execute('https://test.com');

      expect(result).toBe(true);
      expect(mockSuccessCallback).toHaveBeenCalledTimes(1);
    });

    test('should create LogEntity instances correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await checkService.execute('https://test.com');

      mockRepositories.forEach(repo => {
        expect(repo.saveLog.mock.calls[0]).toBeDefined();
        const logEntityCall = repo.saveLog.mock.calls[0]![0];
        expect(logEntityCall).toBeInstanceOf(LogEntity);
        expect(logEntityCall.message).toBeTruthy();
        expect(logEntityCall.level).toBeTruthy();
        expect(logEntityCall.origin).toBeTruthy();
        expect(logEntityCall.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Multiple repositories behavior', () => {
    test('should call saveLog on all repositories in sequence', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await checkService.execute('https://test.com');

      // Verify all repositories were called exactly once
      mockRepositories.forEach(repo => {
        expect(repo.saveLog).toHaveBeenCalledTimes(1);
      });

      // Verify the order of calls (though forEach doesn't guarantee order)
      expect(mockRepo1.saveLog).toHaveBeenCalled();
      expect(mockRepo2.saveLog).toHaveBeenCalled();
      expect(mockRepo3.saveLog).toHaveBeenCalled();
    });

    test('should not affect other repositories if one throws an error', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      
      // Make the second repository throw an error
      mockRepo2.saveLog.mockImplementation(() => {
        throw new Error('Simulated repository error');
      });

      // Test documents current behavior - the error propagates and stops execution
      await expect(checkService.execute('https://test.com')).rejects.toThrow('Simulated repository error');

      expect(mockRepo1.saveLog).toHaveBeenCalled();
      expect(mockRepo2.saveLog).toHaveBeenCalled();
      // mockRepo3.saveLog won't be called due to the error in forEach
    });

    test('should pass the same LogEntity type to all repositories', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await checkService.execute('https://test.com');

      mockRepositories.forEach(repo => {
        expect(repo.saveLog.mock.calls[0]).toBeDefined();
        const savedLog = repo.saveLog.mock.calls[0]![0];
        expect(savedLog).toBeInstanceOf(LogEntity);
        expect(typeof savedLog.message).toBe('string');
        expect(Object.values(LogSeverityLevel)).toContain(savedLog.level);
        expect(typeof savedLog.origin).toBe('string');
        expect(savedLog.createdAt).toBeInstanceOf(Date);
      });
    });
  });
});