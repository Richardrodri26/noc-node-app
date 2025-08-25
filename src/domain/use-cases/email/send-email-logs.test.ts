import { LogEntity, LogSeverityLevel } from '../../entities/log.entity';
import { LogRepository } from '../../repository/log.repository';
import { SendEmailLogs } from './send-email-logs';
import { EmailService } from '../../../presentation/email/email.service';

describe('SendEmailLogs', () => {
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogRepository: jest.Mocked<LogRepository>;
  let sendEmailLogs: SendEmailLogs;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEmailService = {
      sendEmailWithFileSystemLogs: jest.fn(),
    } as any;

    mockLogRepository = {
      saveLog: jest.fn(),
      getLogs: jest.fn(),
    };

    sendEmailLogs = new SendEmailLogs(
      mockEmailService,
      mockLogRepository,
    );
  });

  describe('Successful email sending', () => {
    test('should return true when email is sent successfully', async () => {
      const testEmail = 'test@example.com';
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const result = await sendEmailLogs.execute(testEmail);

      expect(result).toBe(true);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(testEmail);
      expect(mockLogRepository.saveLog).not.toHaveBeenCalled();
    });

    test('should work with single email address as string', async () => {
      const testEmail = 'richardmanuel811@gmail.com';
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const result = await sendEmailLogs.execute(testEmail);

      expect(result).toBe(true);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(testEmail);
    });

    test('should work with multiple email addresses as array', async () => {
      const testEmails = ['user1@test.com', 'user2@test.com', 'admin@company.com'];
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const result = await sendEmailLogs.execute(testEmails);

      expect(result).toBe(true);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(testEmails);
    });

    test('should handle empty array of email addresses', async () => {
      const testEmails: string[] = [];
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const result = await sendEmailLogs.execute(testEmails);

      expect(result).toBe(true);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(testEmails);
    });
  });

  describe('Failed email sending', () => {
    test('should return false and log error when email service returns false', async () => {
      const testEmail = 'richardmanuel811@gmail.com';
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(false);

      const result = await sendEmailLogs.execute(testEmail);

      expect(result).toBe(false);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledTimes(1);
      expect(mockLogRepository.saveLog).toHaveBeenCalledTimes(1);
      expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error: Failed to send email',
          level: LogSeverityLevel.high,
          origin: 'send-email-logs.ts',
          createdAt: expect.any(Date),
        })
      );
    });

    test('should return false and log error when email service throws exception', async () => {
      const testEmail = 'test@example.com';
      const errorMessage = 'SMTP connection failed';
      mockEmailService.sendEmailWithFileSystemLogs.mockRejectedValue(new Error(errorMessage));

      const result = await sendEmailLogs.execute(testEmail);

      expect(result).toBe(false);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledTimes(1);
      expect(mockLogRepository.saveLog).toHaveBeenCalledTimes(1);
      expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Error: ${errorMessage}`,
          level: LogSeverityLevel.high,
          origin: 'send-email-logs.ts',
          createdAt: expect.any(Date),
        })
      );
    });

    test('should handle different types of email service errors', async () => {
      const errorCases = [
        { error: new Error('Invalid email address'), expectedMessage: 'Error: Invalid email address' },
        { error: new Error('SMTP server unavailable'), expectedMessage: 'Error: SMTP server unavailable' },
        { error: new Error('Authentication failed'), expectedMessage: 'Error: Authentication failed' },
        { error: 'String error', expectedMessage: 'String error' },
        { error: { message: 'Object error' }, expectedMessage: '[object Object]' },
      ];

      for (const { error, expectedMessage } of errorCases) {
        jest.clearAllMocks();
        mockEmailService.sendEmailWithFileSystemLogs.mockRejectedValue(error);

        const result = await sendEmailLogs.execute('test@example.com');

        expect(result).toBe(false);
        expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expectedMessage,
            level: LogSeverityLevel.high,
            origin: 'send-email-logs.ts',
          })
        );
      }
    });

    test('should log error with multiple email addresses when failing', async () => {
      const testEmails = ['user1@test.com', 'user2@test.com'];
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(false);

      const result = await sendEmailLogs.execute(testEmails);

      expect(result).toBe(false);
      expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error: Failed to send email',
          level: LogSeverityLevel.high,
          origin: 'send-email-logs.ts',
        })
      );
    });
  });

  describe('Input validation and edge cases', () => {
    test('should handle empty string email', async () => {
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const result = await sendEmailLogs.execute('');

      expect(result).toBe(true);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith('');
    });

    test('should handle malformed email addresses', async () => {
      const malformedEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
      ];

      for (const email of malformedEmails) {
        jest.clearAllMocks();
        mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

        const result = await sendEmailLogs.execute(email);

        expect(result).toBe(true);
        expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(email);
      }
    });

    test('should create LogEntity instances correctly when logging errors', async () => {
      mockEmailService.sendEmailWithFileSystemLogs.mockRejectedValue(new Error('Test error'));

      await sendEmailLogs.execute('test@example.com');

      expect(mockLogRepository.saveLog).toHaveBeenCalledTimes(1);
      const logEntityCall = mockLogRepository.saveLog.mock.calls[0]![0];
      expect(logEntityCall).toBeInstanceOf(LogEntity);
      expect(logEntityCall.message).toBeTruthy();
      expect(logEntityCall.level).toBe(LogSeverityLevel.high);
      expect(logEntityCall.origin).toBe('send-email-logs.ts');
      expect(logEntityCall.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Service interaction', () => {
    test('should not call getLogs method on repository', async () => {
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);
      
      await sendEmailLogs.execute('test@example.com');
      
      expect(mockLogRepository.getLogs).not.toHaveBeenCalled();
    });

    test('should call email service exactly once per execution', async () => {
      const testEmail = 'test@example.com';
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      await sendEmailLogs.execute(testEmail);
      await sendEmailLogs.execute(testEmail);

      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent executions independently', async () => {
      const emails = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);

      const promises = emails.map(email => sendEmailLogs.execute(email));
      const results = await Promise.all(promises);

      expect(results).toEqual([true, true, true]);
      expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledTimes(3);
      emails.forEach(email => {
        expect(mockEmailService.sendEmailWithFileSystemLogs).toHaveBeenCalledWith(email);
      });
    });

    test('should preserve email service response behavior', async () => {
      const testCases = [
        { mockReturn: true, expected: true },
        { mockReturn: false, expected: false },
      ];

      for (const { mockReturn, expected } of testCases) {
        jest.clearAllMocks();
        mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(mockReturn);

        const result = await sendEmailLogs.execute('test@example.com');

        expect(result).toBe(expected);
      }
    });
  });

  describe('Error logging behavior', () => {
    test('should only log when there is an error or failure', async () => {
      // Test success case - should not log
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(true);
      await sendEmailLogs.execute('success@example.com');
      expect(mockLogRepository.saveLog).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Test failure case - should log
      mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(false);
      await sendEmailLogs.execute('failure@example.com');
      expect(mockLogRepository.saveLog).toHaveBeenCalledTimes(1);
    });

    test('should use consistent log properties for all error types', async () => {
      const errorCases = [
        () => mockEmailService.sendEmailWithFileSystemLogs.mockResolvedValue(false),
        () => mockEmailService.sendEmailWithFileSystemLogs.mockRejectedValue(new Error('Network error')),
        () => mockEmailService.sendEmailWithFileSystemLogs.mockRejectedValue(new Error('Auth error')),
      ];

      for (const setupError of errorCases) {
        jest.clearAllMocks();
        setupError();

        await sendEmailLogs.execute('test@example.com');

        expect(mockLogRepository.saveLog).toHaveBeenCalledTimes(1);
        expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: LogSeverityLevel.high,
            origin: 'send-email-logs.ts',
            createdAt: expect.any(Date),
            message: expect.any(String),
          })
        );
      }
    });
  });
});
