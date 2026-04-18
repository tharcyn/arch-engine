export class KubernetesAdmissionAdapter {
    static applyAdmissionPolicy(): string {
        return 'admission-allowed';
    }
}

export class MutatingAdmissionHook {}
export class ValidatingAdmissionHook {}
