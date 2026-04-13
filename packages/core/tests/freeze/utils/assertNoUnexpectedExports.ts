export function assertNoUnexpectedExports(actualExports: string[], expectedExports: string[]) {
    const missing = expectedExports.filter(e => !actualExports.includes(e));
    const unexpected = actualExports.filter(e => !expectedExports.includes(e));

    if (missing.length > 0 || unexpected.length > 0) {
        throw new Error(
            `[FREEZE_EXPORT_SURFACE_MUTATION] Export surface mutation detected.\nMissing: ${missing.join(', ')}\nUnexpected: ${unexpected.join(', ')}`
        );
    }
}
