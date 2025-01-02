//Make a call to the GitHub API to get Copilot Metrics, the API is /api/github/orgs/toussaintt/copilot/usage
//Add the header Accept: application/vnd.github+json to the request
//Add also the Authorization: Bearer <token> header where <token> is hardcoded for now
//Also add X-GitHub-Api-Version: 2022-11-28 header
//Return the response from the API

import axios from "axios";

import { Metrics } from "../model/Metrics";
import organizationMockedResponse from '../assets/organization_response_sample.json';
import enterpriseMockedResponse from '../assets/enterprise_response_sample.json';
import config from '../config';
import { GHOrgs } from "@/model/GHOrgs";
import { GHOrg } from "@/model/GHOrgs";
import { GHTeam } from "@/model/GHTeams";
import { GHTeams } from "@/model/GHTeams";
import e from "express";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(config.github.token ? { Authorization: `token ${config.github.token}` } : {})
};

export const getMetricsApi = async (): Promise<Metrics[]> => {

  let response;
  let metricsData;

  if (config.mockedData) {
    console.log("Using mock data. Check VUE_APP_MOCKED_DATA variable.");
    response = organizationMockedResponse ;//: enterpriseMockedResponse;
    metricsData = response.map((item: any) => new Metrics(item));
  } else {
    let metricsUrl = '';
    if (config.github.currentSelOrg.startsWith('Ent-')) {
      const currentEnt = config.github.currentSelOrg.split('-')[1];
      metricsUrl = `${config.github.baseApi}/enterprises/${currentEnt}/copilot/usage`;
    }else{
      metricsUrl = `${config.github.baseApi}/orgs/${config.github.currentSelOrg}/copilot/usage`;
    }
    response = await axios.get(
      metricsUrl,
      {
       headers
      }
    );
    metricsData = response.data.map((item: any) => new Metrics(item));
  }
  return metricsData;
};

export const getTeamMetricsApi = async (): Promise<Metrics[]> => {
  const response = await axios.get(
      `${config.github.baseApi}/orgs/${config.github.currentSelOrg}/team/${config.github.currentSelTeam}/copilot/usage`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${config.github.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return response.data.map((item: any) => new Metrics(item));

}

export const getOrgs = async (): Promise<GHOrgs> => {
  const response = await axios.get(`${config.github.baseApi}/user/orgs`, {
    headers
  });
  //just return the data from the response if it is not null, or empty array if null
  if (!response.data) 
    return  Promise.resolve(new GHOrgs([]));
  return Promise.resolve(new GHOrgs(response.data));
}

//define a new function to get the teams for a specific organization
export const getTeamsForOrg = async (orgName: string): Promise<GHTeams> => {
  const response = await axios.get(`${config.github.baseApi}/orgs/${orgName}/teams`, {
    headers
  });
  if (!response.data) 
    return Promise.resolve(new GHTeams([]));
  return Promise.resolve(new GHTeams(response.data));
}


  