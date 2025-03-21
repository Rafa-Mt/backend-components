import CacheManager from "@db/cacheManager";
import DbManager, { DbAdapter } from "@db/dbManager";

interface AuthManagerArgs {
    cacheManager: CacheManager
    dbManager: DbManager<any>
    buildQuery: string;
}

const testResult = [{
    moduleName: "mod1",
    totalAccess: ["admin"],
    actions: {
        "read": ["user"],
        "edit": ["manager"]
    }

}]

export default class AuthManager {
    private cacheManager!: CacheManager

    private constructor() {}

    public static async create({ dbManager, cacheManager, buildQuery }: AuthManagerArgs): Promise<void> {
        const response = await dbManager.executeQueryByName(buildQuery) 
            ?? new Error("Auth data not found");

        const instance = new AuthManager()
        instance.cacheManager = cacheManager

        if (response instanceof Error) 
            throw response;

        // TODO: Implement the logic to parse the response and populate the authorizedAreas object
    }

    public async checkAccess(area: string, action: string, role: string): Promise<boolean> {
        // const results = 
        return true
    }
}