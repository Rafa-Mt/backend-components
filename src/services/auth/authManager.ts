import DbManager, { DbAdapter } from "../db/dbManager.js";

interface AuthManagerArgs<T extends DbAdapter> {
    dbManager: DbManager<T>;
    buildQuery: string;
}

const testResult = {
    "class1": {
        totalAccess: ["admin"],
        methods: {
            "read": ["user"],
            "edit": ["manager"]
        }
    }
}

export default class AuthManager<T extends DbAdapter> {
    private authorizedAreas: Record<string, Record<string, string[]>> = {};
    private dbManager: DbManager<T>;
    private buildQuery: string;

    constructor({ dbManager, buildQuery }: AuthManagerArgs<T>) {
        this.dbManager = dbManager;
        this.buildQuery = buildQuery;
    }

    public async init(): Promise<void> {
        const response = await this.dbManager.executeQueryByName(this.buildQuery) 
            ?? new Error("Auth data not found");

        if (response instanceof Error) 
            throw response;

        // TODO: Implement the logic to parse the response and populate the authorizedAreas object
    }

    public checkAccess(area: string, action: string, role: string): boolean {
        if (!this.authorizedAreas[area]) return false;

        return this.authorizedAreas[area][action].includes(role);
    }
}