# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of RAG Financial AI Agent seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

Please report security vulnerabilities by emailing us directly at:
**[security@ragfinancialai.com]** (replace with actual email)

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

When reporting a vulnerability, please include the following information:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### Response Timeline

- We will acknowledge your email within 48 hours
- We will provide a detailed response within 7 days indicating next steps
- We will keep you informed of our progress towards a fix and disclosure
- We may ask for additional information or guidance

### Disclosure Policy

- We ask that you give us a reasonable amount of time to resolve the issue before any disclosure to the public or a third party
- We will credit you in our security advisory (unless you prefer to remain anonymous)
- We will coordinate the timing of the disclosure with you

## Security Measures

### Current Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **File Upload Security**: Comprehensive file type and content validation
- **Rate Limiting**: API endpoints are protected against abuse
- **CORS Protection**: Configured for secure cross-origin requests
- **Environment Isolation**: Sensitive configuration separated from code
- **Container Security**: Docker images scanned for vulnerabilities

### Security Best Practices

When deploying this application:

1. **Environment Variables**
   - Never commit `.env.local` or similar files
   - Use strong, unique values for all secrets
   - Rotate secrets regularly

2. **Network Security**
   - Use HTTPS in production
   - Configure firewalls appropriately
   - Limit access to necessary ports only

3. **Container Security**
   - Keep base images updated
   - Run containers as non-root users
   - Use minimal base images

4. **Monitoring**
   - Enable logging for security events
   - Monitor for unusual activity patterns
   - Set up alerts for security incidents

5. **Dependencies**
   - Keep all dependencies updated
   - Regularly audit for known vulnerabilities
   - Use dependabot or similar tools

### Known Security Considerations

- **Local LLM Access**: Ollama service should not be exposed to public networks
- **File Processing**: Uploaded files are processed server-side; ensure proper sandboxing
- **Vector Storage**: Index data contains document content; secure appropriately
- **API Access**: Consider implementing authentication for production use

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Updates will be announced through:

- GitHub Security Advisories
- Release notes
- Security mailing list (if you'd like to be added, contact us)

## Contact

For any questions about this security policy, please contact:
- Email: [security@ragfinancialai.com] (replace with actual email)
- GitHub: Create a private security advisory

Thank you for helping keep RAG Financial AI Agent secure!
