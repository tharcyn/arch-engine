export class RouteIdentityBuilder {

    /**
     * Ensures URI starts with a `/` and removes trailing slashes (except for root `/`),
     * resulting in the canonical format.
     */
    public normalizeUriSlash(uri: string): string {
        let cleanUri = uri;
        if (!cleanUri.startsWith('/')) {
            cleanUri = '/' + cleanUri;
        }
        if (cleanUri.length > 1 && cleanUri.endsWith('/')) {
            cleanUri = cleanUri.replace(/\/+$/, '');
        }
        return cleanUri;
    }

    /**
     * Builds an immutable canonical identity tuple:
     * METHOD|/normalized/uri|FQCN|action|route_name_or_none
     */
    public buildIdentity(br: any): string {
        const method = (br.method || 'GET').toUpperCase();
        const uri = this.normalizeUriSlash(br.uri || br.file_path || '/');
        const fqcn = br.controller_fqcn || br.controller || 'Closure';
        const action = br.action || br.controller_method || '__invoke';
        const routeName = br.name || 'none';
        
        return `${method}|${uri}|${fqcn}|${action}|${routeName}`;
    }
}
