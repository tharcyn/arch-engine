import { GovernanceOperatorSDK } from '../../../../operator-sdk/src/index.js';

export async function operatorInitCommand(options: any) {
    const result = { status: GovernanceOperatorSDK.initOperator() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function operatorValidateCommand(options: any) {
    const result = { status: GovernanceOperatorSDK.validateOperator() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function operatorPublishCommand(options: any) {
    const result = { status: GovernanceOperatorSDK.publishOperator() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
