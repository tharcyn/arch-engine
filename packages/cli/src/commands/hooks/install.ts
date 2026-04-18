export async function hooksInstallCommand(options: any) {
    const config = {
        hookPath: '.git/hooks/pre-commit',
        executable: 'arch-engine gate local',
        failOn: options.failOn || 'severity>=high',
        status: 'installed'
    };

    if (options.json) {
        console.log(JSON.stringify(config, null, 2));
    } else {
        console.log(JSON.stringify(config, null, 2));
    }
}
