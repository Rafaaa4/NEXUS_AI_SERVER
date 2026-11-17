export class LogRedactor {
  private static patterns = [
    // Private keys
    /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/gi,
    // Bearer / JWT tokens
    /Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/gi,
    /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    // API keys & secrets in assignments or JSON
    /(api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token)\s*[:=]\s*["']?([^\s"',;]+)["']?/gi,
    // Database connection URLs with passwords
    /(postgres|mysql|redis|mongodb):\/\/[^:]+:([^@]+)@/gi,
    // AWS keys
    /(AKIA[0-9A-Z]{16})/g,
  ];

  static redact(text: string): string {
    if (!text) return text;
    let redacted = text;

    // Redact private keys completely
    redacted = redacted.replace(
      /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/gi,
      '[REDACTED_PRIVATE_KEY]'
    );

    // Redact database passwords
    redacted = redacted.replace(
      /(postgres|mysql|redis|mongodb):\/\/([^:]+):([^@]+)@/gi,
      '$1://$2:[REDACTED_PASSWORD]@'
    );

    // Redact Bearer tokens
    redacted = redacted.replace(
      /Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/gi,
      'Bearer [REDACTED_TOKEN]'
    );

    // Redact generic key/token/password assignments
    redacted = redacted.replace(
      /(api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token)\s*([:=])\s*(["']?)([^\s"',;]+)(["']?)/gi,
      '$1$2$3[REDACTED]$5'
    );

    // Redact AWS access keys
    redacted = redacted.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]');

    return redacted;
  }
}
