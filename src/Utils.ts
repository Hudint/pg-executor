

export default class Utils {
    private constructor() {}

    static isProductionBuild() {
        return process.env.NODE_ENV === 'production';
    }

    static present<T>(value: T | undefined | null, callback: (value: T)=>void, notPresentCallback?: ()=>void){
        if(value) callback(value)
        else if(notPresentCallback) notPresentCallback();
    }

    static matches(input: string, regex: RegExp) {
        let matches = [];
        let current: RegExpMatchArray | null;
        while (current = regex.exec(input)) {
            matches.push(current);
        }
        return matches;
    }

    static getEnv(key: string, defaultValue?: string): string {
        const value = process.env[key]
        if (value || defaultValue !== undefined)
            return value ?? defaultValue;
        throw new Error(`${key} is not in env variables!`)
    }

    static getEnvNumber(key: string, defaultValue?: string): number {
        const result = Number.parseInt(this.getEnv(key, defaultValue));
        if(isNaN(result)) {
            throw new Error(`${key} is not a valid number in env variables!`)
        }
        return result;
    }
}
