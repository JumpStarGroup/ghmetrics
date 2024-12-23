export class GHOrg {
    avatar_url: string;
    description: string;
    events_url: string;
    hooks_url: string;
    id: number;
    issues_url: string;
    login: string;
    members_url: string;
    node_id: string;
    public_members_url: string;
    repos_url: string;
    url: string;
    
    constructor(data: any) {
        this.login = data.login;
        this.id = data.id;
        this.node_id = data.node_id;
        this.url = data.url;
        this.repos_url = data.repos_url;
        this.events_url = data.events_url;
        this.hooks_url = data.hooks_url;
        this.issues_url = data.issues_url;
        this.members_url = data.members_url;
        this.public_members_url = data.public_members_url;
        this.avatar_url = data.avatar_url;
        this.description = data.description;
    }
}
export class GHOrgs {
    orgs: GHOrg[];
    constructor(data: any) {
        // data is an array of objects, map it to create GHOrg and store it in orgs
        this.orgs = data.map((item: any) => new GHOrg(item));
    }
}