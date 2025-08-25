import { LogEntity, LogSeverityLevel } from '../../entities/log.entity';
import { CheckService } from './check-service';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CheckService UseCase', () => {
  const mockRepository = {
    saveLog: jest.fn(),
    getLogs: jest.fn(),
  };

  const mockSuccessCallback = jest.fn();
  const mockErrorCallback = jest.fn();

  let checkService: CheckService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    checkService = new CheckService(
      mockRepository,
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

    test('should save success log with correct properties', async () => {
      const testUrl = 'https://example.com';

      await checkService.execute(testUrl);

      expect(mockRepository.saveLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Service ${testUrl} working`,
          level: LogSeverityLevel.low,
          origin: 'check-service.ts',
          createdAt: expect.any(Date),
        })
      );
    });

    test('should work with different valid URLs', async () => {
      const testUrls = [
        'https://httpbin.org/get',
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://api.github.com',
      ];

      for (const url of testUrls) {
        mockFetch.mockClear();
        jest.clearAllMocks();

        const result = await checkService.execute(url);

        expect(result).toBe(true);
        expect(mockSuccessCallback).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(url);
      }
    });
  });

  describe('Failed service checks', () => {
    test('should call errorCallback when fetch response is not ok', async () => {
      const testUrl = 'https://httpstat.us/404';
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response;
      
      mockFetch.mockResolvedValue(errorResponse);

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

    test('should save error log with correct properties when service fails', async () => {
      const testUrl = 'https://httpstat.us/500';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await checkService.execute(testUrl);

      expect(mockRepository.saveLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(testUrl),
          level: LogSeverityLevel.high,
          origin: 'check-service.ts',
          createdAt: expect.any(Date),
        })
      );
    });

    test('should handle different HTTP error statuses', async () => {
      const errorCases = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 404, statusText: 'Not Found' },
        { status: 500, statusText: 'Internal Server Error' },
      ];

      for (const errorCase of errorCases) {
        mockFetch.mockClear();
        jest.clearAllMocks();

        mockFetch.mockResolvedValue({
          ok: false,
          ...errorCase,
        } as Response);

        const result = await checkService.execute('https://test.com');

        expect(result).toBe(false);
        expect(mockErrorCallback).toHaveBeenCalledTimes(1);
        expect(mockRepository.saveLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogSeverityLevel.high,
          })
        );
      }
    });
  });

  describe('Edge cases and error handling', () => {
    test('should work with undefined callbacks', async () => {
      const serviceWithoutCallbacks = new CheckService(
        mockRepository,
        undefined,
        undefined
      );

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const result = await serviceWithoutCallbacks.execute('https://test.com');

      expect(result).toBe(true);
      expect(mockRepository.saveLog).toHaveBeenCalledTimes(1);
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

    test('should create LogEntity instances correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await checkService.execute('https://test.com');

      const logEntityCall = mockRepository.saveLog.mock.calls[0][0];
      expect(logEntityCall).toBeInstanceOf(LogEntity);
      expect(logEntityCall.message).toBeTruthy();
      expect(logEntityCall.level).toBeTruthy();
      expect(logEntityCall.origin).toBeTruthy();
      expect(logEntityCall.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Repository interaction', () => {
    test('should always call saveLog regardless of success or failure', async () => {
      // Test success case
      mockFetch.mockResolvedValue({ ok: true } as Response);
      await checkService.execute('https://test.com');
      expect(mockRepository.saveLog).toHaveBeenCalledTimes(1);

      // Reset and test failure case
      jest.clearAllMocks();
      mockFetch.mockResolvedValue({ ok: false } as Response);
      await checkService.execute('https://test.com');
      expect(mockRepository.saveLog).toHaveBeenCalledTimes(1);
    });

    test('should not call getLogs method', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      
      await checkService.execute('https://test.com');
      
      expect(mockRepository.getLogs).not.toHaveBeenCalled();
    });
  });
});