import { GHOrgs } from "./model/GHOrgs";
import { GHTeams } from "./model/GHTeams";
import { GHOrg } from "./model/GHOrgs";
import { GHTeam } from "./model/GHTeams";
import { defineComponent, ref } from 'vue'

const PROPS = ["MOCKED_DATA", "SCOPE", "GITHUB_ORG", "GITHUB_ORGs", "GITHUB_ENT", "GITHUB_TEAM", "GITHUB_TOKEN", "GITHUB_API"];

const env: any = {};
PROPS.forEach(prop => {
	const propName = `VUE_APP_${prop}`;
	if (process.env.NODE_ENV === "production") {
		env[propName] = (window as any)["_ENV_"][propName];
	}
	else {
		env[propName] = process.env[propName];
	}
});

const VALID_SCOPE = ['organization', 'enterprise'];

// let scopeType;
// if (VALID_SCOPE.includes(env.VUE_APP_SCOPE)) {
// 	scopeType = env.VUE_APP_SCOPE as 'enterprise' | 'organization'
// }

let apiUrl: string = '';
const githubOrgName = env.VUE_APP_GITHUB_ORG;
const githubOrgs = env.VUE_APP_GITHUB_ORGs; //add orgs contents
const githubEntName = env.VUE_APP_GITHUB_ENT;
const baseApi = env.VUE_APP_GITHUB_API; 

//add the tring array 'allGithubOrgs' to store all the organization names for all the 
//enterprises the current user belongs to with the formation should be
// 'org1|org2|org3|...|orgn'
const allGithubOrgs: string[] = []; 
//store the current organization name selected
const currentSelOrg: string = '';
//add the string array 'allGithubTeams' to store all the team names for all the
//organizations the current user belongs to, and the formation should be
// 'org1:team1|team2|team3|...|teamn;org2:team1|team2|team3|...|teamn;...;orgn:team1|team2|team3|...|teamn'
const allGithubTeams: string[] = [];
const currentSelTeam: string = ''; //store the current team name selected
const currentSelTeams: string[] = []; //store the current team names selected
let initOrgsTeams: boolean = false; //store the flag to indicate if the orgs and teams are initialized

let scopeName: string;
let orgNames = githubOrgs.split('|'); //add orgs contents
// if (scopeType === 'organization') {
// 	scopeName = githubOrgName;
// 	apiUrl = `${baseApi || 'https://api.github.com'}/orgs/${githubOrgName}`;
// }
// else if (scopeType === 'enterprise') {
// 	scopeName = githubEntName;
// 	apiUrl = `${baseApi || 'https://api.github.com'}/enterprises/${githubEntName}`;
// }
// else {
// 	throw new Error(`Invalid VUE_APP_SCOPE value: ${env.VUE_APP_SCOPE}. Valid values: ${VALID_SCOPE.join(', ')}`)
// }

const config: Config = {
	changeCurrentOrg: changeCurrentOrg,
	changeCurrentTeam: changeCurrentTeam,
	initORgs_Teams: initORgs_Teams,
    orgsTeamsInited: initOrgsTeams,
	//changeOrg: changeOrg,
	//changeOrgs: changeOrgs,
	mockedData: env.VUE_APP_MOCKED_DATA === "true",
	// scope: {
	// 	type: scopeType,
	// 	name: scopeName,
	// },
	github: {
		org: githubOrgName,
		orgs: orgNames, //add orgs contents
		ent: env.VUE_APP_GITHUB_ENT,
		team: env.VUE_APP_GITHUB_TEAM,
		token: env.VUE_APP_GITHUB_TOKEN,
		apiUrl,
		baseApi,
		//add the variables to get the enterprise, organization and team names
		allGithubOrgs,
		currentSelOrg,
		allGithubTeams,
		currentSelTeam,
		currentSelTeams,

		
	}
}
if (!config.mockedData && !config.github.token && !config.github.baseApi) {
	throw new Error("VUE_APP_GITHUB_TOKEN environment variable must be set or calls have to be proxied by the api layer.");
}

//define the function to setup the allGithubOrgs and currentSelOrgs value
// function changeOrgs(allOrgs: GHOrgs) {
// 	//iterate the allOrgs to get the organization names and store them in the allGithubOrgs
// 	allOrgs.orgs.forEach((org) => {
// 		allGithubOrgs
// 	});

// 	config.github.allGithubOrgs = orgNames;
// }

//deifne the function to change the current team name
function changeCurrentTeam(teamName: string) {
	config.github.currentSelTeam = teamName;
}

//define the function to change the current organization name
function changeCurrentOrg(orgName: string) {
	if (  orgName === 'ALL' ) {
		config.github.currentSelOrg = orgName;
		config.github.currentSelTeams = config.github.allGithubTeams[0].split(':')[1].split('|');
		config.github.apiUrl = `${config.github.baseApi}/orgs/${config.github.currentSelOrg}`;
		return;
	}
	config.github.currentSelOrg = orgName;
	//get the team names string with from the string list variable allGithubTeams which 
	//start with the string equal to orgName + ':'
	const nowSelectedTeamsString = allGithubTeams.filter((teamNames) => teamNames.startsWith(orgName + ':'))[0];
	//get the team names list from the string and store it in the currentSelTeams
	config.github.currentSelTeams = nowSelectedTeamsString.split(':')[1].split('|');
	config.github.currentSelTeam = config.github.currentSelTeams[0];
}

//define the function to init Orgs and Teams and set the current organization and team name
function initORgs_Teams(nowAllOrgs: string[], nowAllTeams: string[]) {
	//store the organization names in the allGithubOrgs
	config.github.allGithubOrgs = nowAllOrgs;
	//store the team names in the allGithubTeams
	config.github.allGithubTeams = nowAllTeams;
	//set the current organization name and team name
	changeCurrentOrg(nowAllOrgs[0]);

}

export default config;
export { changeCurrentOrg };
export { changeCurrentTeam };
export { initORgs_Teams };

interface Config {
	initORgs_Teams: (nowAllOrgs: string[], nowAllTeams: string[]) => void;
	changeCurrentOrg: (orgName: string) => void;
	changeCurrentTeam: (teamName: string) => void;
	mockedData: boolean;
	orgsTeamsInited: boolean;
	github: {
		/** The GitHub organization name. */
		org: string; 
		/** The GitHub enterprise name. */
		orgs: string[]; //add orgs contents
		/** The GitHub enterprise name. */

		ent: string;
		/** The GitHub team name. */
		team: string;
		/** 
		 * The GitHub token to authenticate requests. 
		 * 
		 * CAUTION: Do not expose the token in the client-side code.
		 * */
		token: string;
		/**
		 * The GitHub API URL, different for GitHub Organization and GitHub Enterprise.
		 * 
		 * This is the base URL for the GitHub API. It can be customized to use GitHub Enterprise or GitHub.com.
		 * When using the proxy, it used `env.VUE_APP_GITHUB_API` to set the base URL, so that requests are sent to the proxy before being forwarded to the GitHub API.
		 * 
		 */
		apiUrl: string;
		/**
		 * The base URL for the GitHub API. When set to `/api/github` it sends data via proxy to the GitHub API to hide the token.
		 * 
		 * default: https://api.github.com
		 */
		baseApi: string;
		//add the variables to get the enterprise, organization and team names
        //formation for allGithubOrgs should be array - 
		// if with enterprise name => Array of string begin with - (['Ent:enterpriseName'])
		// others => Array of strings (['org1'],['org2'])
		allGithubOrgs: string[];
        //store the current organization name selected, shuold consider refresh corresponding teams
		currentSelOrg: string; 
		//formation for allGithubTeams should be array -
		// if with enterprise name => Array of string begin with - (['ALL'])
		// others => Array of strings (['org1:ALL|team1|team2|team3|...|teamn'],['org2:ALL|eam1|team2|team3|...|teamn'])
		allGithubTeams: string[];
		//store the current teams names for corresponding organization selected
		currentSelTeams: string[];
		currentSelTeam: string; 
	}
}
