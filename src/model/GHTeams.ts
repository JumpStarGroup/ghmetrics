//define GitHub Team model
export class GHTeam{
    id: number;
    node_id: string;
    url: string;
    name: string;
    slug: string;
    description: string;
    privacy: string;
    permission: string;
    parent: string;
    constructor(data: any){
        this.id = data.id;
        this.node_id = data.node_id;
        this.url = data.url;
        this.name = data.name;
        this.slug = data.slug;
        this.description = data.description;
        this.privacy = data.privacy;
        this.permission = data.permission;
        this.parent = data.parent;
    }
}
//define GitHub Teams model
export class GHTeams{
    teams: GHTeam[];
    constructor(data: any){
        this.teams = data.map((item: any) => new GHTeam(item));
    }
}