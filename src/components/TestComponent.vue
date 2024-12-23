//this component is used to test the functionality of the vue component
//it is not used in the final product
<template>
 <v-card>
    <v-toolbar color="indigo" elevation="4">
      <v-btn icon>
        <v-icon>mdi-github</v-icon>
      </v-btn>

      <v-toolbar-title class="toolbar-title">Copilot Metrics Viewer 
      </v-toolbar-title>
      <h2 class="error-message"> Error Message </h2>
      <v-spacer></v-spacer>
    </v-toolbar>
</v-card>
</template>
 
<script lang="ts">
import { defineComponent, ref } from 'vue';
import config from '../config';
import { GHOrg } from '@/model/GHOrgs';
import { GHOrgs } from '@/model/GHOrgs';
import { GHTeam } from '@/model/GHTeams';
import { GHTeams } from '@/model/GHTeams';
//import { getMetricsApi } from '@/api/GitHubApi';
import { getOrgs } from '../api/GitHubApi';
import { getTeamsForOrg } from '../api/GitHubApi';
export default defineComponent({
  name: 'TestComponent',

  components: {
    // MainComponent,
  },

  data () {
    return {
      //
    }
  },
  computed: {
    // a computed getter

  },
  setup() {
    console.log("TestComponent setup");

    const initOrgsTeams = async () => {
      console.log('initOrgsTeams now');
      //get the orgs with the function : getorgs from githubapi.ts and store to a GHOrgs object
      const orgs = await getOrgs();
      let orgs_strings: string[] = [];
      let teams_strings: string[] = [];
      console.log('orgs:', orgs_strings);
      console.log('teams:', teams_strings);
      //if config.github.ent is empty or null, 
      // then insert with Ent:enterprieName  into config.github.allGithubOrgs in the beginning
      if (config.github.ent && config.github.ent !== '') {
        orgs_strings.push('Ent-'+config.github.ent);
        teams_strings.push(config.github.ent+':ALL');
      };
      console.log('1 - orgs:', orgs_strings);
      console.log('1 - teams:', teams_strings);
      //get the org names from the GHOrgs object and contact it to a string seperate by '|';
      // and then get the teams information for each orgs with the function : getTeamsForOrg from githubapi.ts
      // and store the teams information to a GHTeams object
       orgs.orgs.forEach(async ( org: GHOrg ):Promise<void> => {
         orgs_strings.push(org.login);
         let nowteams_strings = org.login + ':ALL|'; 
         const teams = await getTeamsForOrg(org.login);
         teams.teams.forEach((team: GHTeam):void => {
            nowteams_strings += team.name + '|';
            console.log('team:', team.name);
         });
         nowteams_strings = nowteams_strings.slice(0, -1);//remove the last '|'
         teams_strings.push(nowteams_strings);
       });
    config.initORgs_Teams(orgs_strings, teams_strings);
    config.changeCurrentOrg(config.github.allGithubOrgs[0]);
    config.changeCurrentTeam(config.github.allGithubTeams[0]);
    console.log('orgs:', config.github.allGithubOrgs);
    console.log('teams:', config.github.allGithubTeams);
    config.orgsTeamsInited = true;
  };
  if (!config.orgsTeamsInited){
    console.log('initOrgsTeams from outside');
    initOrgsTeams();
  };
    
  return {};
  }
});
</script>