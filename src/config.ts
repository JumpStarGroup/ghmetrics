import { GHOrgs } from "./model/GHOrgs";
import { GHTeams } from "./model/GHTeams";
import { GHOrg } from "./model/GHOrgs";
import { GHTeam } from "./model/GHTeams";
import { defineComponent, ref } from 'vue'

const PROPS = ["MOCKED_DATA", "SCOPE", "GITHUB_ORG", "GITHUB_ORGs", "GITHUB_ENT", "GITHUB_TEAM", "GITHUB_TOKEN", "GITHUB_API", "MICROSOFT"];

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

const apiUrl = ref<string>('');
const githubOrgName = env.VUE_APP_GITHUB_ORG;
const githubOrgs = env.VUE_APP_GITHUB_ORGs; //add orgs contents
const entName = env.VUE_APP_GITHUB_ENT;
const baseApi = env.VUE_APP_GITHUB_API; 
const isMicrosoft = env.VUE_APP_MICROSOFT === 'true';
//add the tring array 'allGithubOrgs' to store all the organization names for all the 
//enterprises the current user belongs to with the formation should be
// 'org1|org2|org3|...|orgn'
const allGithubOrgs : string[] = []; 
//store the current organization name selected
const currentSelOrg = ref<string>('');
//add the string array 'allGithubTeams' to store all the team names for all the
//organizations the current user belongs to, and the formation should be
// 'org1:team1|team2|team3|...|teamn;org2:team1|team2|team3|...|teamn;...;orgn:team1|team2|team3|...|teamn'
const allGithubTeams : string[] = [];
const currentSelTeam  = ref<string>(''); //store the current team name selected
const currentSelTeams : string[] = []; //store the current team names selected
const initOrgsTeams = false; //store the flag to indicate if the orgs and teams are initialized

let scopeName: string;
const orgNames = githubOrgs.split('|'); //add orgs contents

const config: Config = {
	changeCurrentOrg: changeCurrentOrg,
	changeCurrentTeam: changeCurrentTeam,
	initORgs_Teams: initORgs_Teams,
    orgsTeamsInited: initOrgsTeams,
	isMSFT: isMicrosoft,
	mockedData: env.VUE_APP_MOCKED_DATA === "true",

	github: {
		org: githubOrgName,
		orgs: orgNames, //add orgs contents
		entName: entName,
		team: env.VUE_APP_GITHUB_TEAM,
		token: env.VUE_APP_GITHUB_TOKEN,
		apiUrl: apiUrl.value,
		baseApi,
		//add the variables to get the enterprise, organization and team names
		allGithubOrgs: allGithubOrgs,
		currentSelOrg: currentSelOrg.value,
		allGithubTeams: allGithubTeams,
		currentSelTeam: currentSelTeam.value,
		currentSelTeams: currentSelTeams,

		
	}
}
if (!config.mockedData && !config.github.token && !config.github.baseApi) {
	throw new Error("VUE_APP_GITHUB_TOKEN environment variable must be set or calls have to be proxied by the api layer.");
}

//define the function to change the current team name
function changeCurrentTeam(teamName: string) {
	config.github.currentSelTeam = teamName;
	if(teamName !== 'ALL') 
		config.github.apiUrl = `${config.github.baseApi}/orgs/${config.github.currentSelOrg}/teams/${teamName}`;
}

//define the function to change the current organization name
function changeCurrentOrg(orgName: string) {
	if (  orgName.startsWith('Ent-') ) {
		//this set the apiUrl to the enterprise api url
		config.github.currentSelOrg = orgName;
		const enterpriseName = orgName.split('-')[1];
		config.github.currentSelTeams = config.github.allGithubTeams[0].split(':')[1].split('|');
		config.github.currentSelTeam = config.github.currentSelTeams[0];
		config.github.apiUrl = `${config.github.baseApi}/enterprise/${enterpriseName}`;
		return;
	}
	//set the currentSelOrg with no enterprise name
	config.github.currentSelOrg = orgName;
	//get the team names string with from the string list variable allGithubTeams which 
	//start with the string equal to orgName + ':'
	//const nowSelectedTeamsString = config.github.allGithubTeams.filter((teamNames: string) => teamNames.(orgName + ':'));
	let nowSelectedTeamsString = '';
	for (let i = 0; i < config.github.allGithubTeams.length; i++) {
		if (config.github.allGithubTeams[i].startsWith(orgName + ':')) {
			nowSelectedTeamsString = config.github.allGithubTeams[i].split(':')[1];
			break;
		}
	} 
	//get the team names list from the string and store it in the currentSelTeams
	config.github.currentSelTeams = nowSelectedTeamsString.split('|');
	config.github.apiUrl = `${config.github.baseApi}/orgs/${orgName}`;
	config.github.currentSelTeam = config.github.currentSelTeams[0];
}

//define the function to init Orgs and Teams and set the current organization and team name
function initORgs_Teams(nowAllOrgs: string[], nowAllTeams: string[]) {
	//store the organization names in the allGithubOrgs
	config.github.allGithubOrgs = nowAllOrgs;
	//store the team names in the allGithubTeams
	config.github.allGithubTeams = nowAllTeams;
}

export default config;
export { changeCurrentOrg };
export { changeCurrentTeam };
export { initORgs_Teams };

interface Config {
	initORgs_Teams: (nowAllOrgs: string[], nowAllTeams: string[]) => void;
	changeCurrentOrg: (orgName: string) => void;
	changeCurrentTeam: (teamName: string) => void;
	isMSFT: boolean;
	mockedData: boolean;
	orgsTeamsInited: boolean;
	github: {
		/** The GitHub organization name. */
		org: string; 
		/** The GitHub enterprise name. */
		orgs: string[]; //add orgs contents
		/** The GitHub enterprise name. */
		entName: string;
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
		/**
		 * The base URL for the GitHub API. When set to `/api/github` it sends data via proxy to the GitHub API to hide the token.
		 * 
		 * default: https://api.github.com
		 */
		baseApi: string;
		apiUrl: string;
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
