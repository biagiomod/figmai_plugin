# Migration Documentation Index

Complete guide for migrating the FigmAI plugin to restricted custom or enterprise environments.

---

## Documentation Files

1. **[Custom Migration Guide](../work-plugin/migration-guide.md)** ⭐ START HERE
   - Complete step-by-step migration guide
   - Prerequisites and checklists
   - Extension points implementation
   - Configuration and troubleshooting
   - Verification checklist

2. **[Portability Analysis](./portability-analysis.md)**
   - Risk findings and portability assessment
   - Required configuration changes
   - Extension point recommendations
   - Implementation priorities

3. **[Extension Points Reference](../work-plugin/extension-points.md)**
   - All extension points (Custom Adapter hooks)
   - Implementation guide (Component Scanner, KB Loader, Compliance Hook, Custom Provider)
   - Examples and best practices

4. **[Custom Adapter Pattern](../work-plugin/adapter-pattern.md)**
   - Custom adapter architecture
   - Override mechanism
   - Migration path

5. **[Configuration Guide](../configuration.md)**
   - Configuration schema reference
   - Environment variables
   - Config file format
   - Settings UI guide

6. **[Security Guide](../security.md)**
   - Data storage locations
   - Credential management
   - Network security
   - Compliance considerations

---

## Quick Start

1. **Read:** [Custom Migration Guide](../work-plugin/migration-guide.md) for complete migration steps
2. **Review:** [Portability Analysis](./portability-analysis.md) for risk assessment
3. **Implement:** Extensions as needed (see [Extension Points](../work-plugin/extension-points.md))
4. **Configure:** Use [Configuration Guide](../configuration.md)
5. **Validate:** Follow verification checklist in migration guide

---

## Migration Checklist Summary

### Pre-Migration
- [ ] Verify Node.js/npm access
- [ ] Verify network/proxy access
- [ ] Verify authentication requirements
- [ ] Identify required configuration

### Migration
- [ ] Create custom configuration file
- [ ] Set environment variables (if needed)
- [ ] Implement extensions (if needed)
- [ ] Configure settings in plugin
- [ ] Build and test

### Validation
- [ ] Health check succeeds
- [ ] Assistants load correctly
- [ ] Messages send/receive
- [ ] Extensions execute (if implemented)
- [ ] Security checks pass

---

## Support

For questions or issues:
1. Review relevant documentation file
2. Check troubleshooting sections
3. Review portability analysis for known issues
4. Contact your IT/security team for environment-specific issues

