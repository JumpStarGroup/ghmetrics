<template>
  <v-card>
    <v-toolbar color="indigo" elevation="4">
      <v-btn icon>
        <v-icon>mdi-github</v-icon>
      </v-btn>

      <v-toolbar-title class="toolbar-title">Copilot Metrics Viewer 
      </v-toolbar-title>
      <h2 class="error-message"> {{ mockedDataMessage }} </h2>
      <v-spacer></v-spacer>
      <div v-for="(items, index) in allItems" :key="index">
        <v-autocomplete
          label="Enterprise & Orgnization" :items=items
        ></v-autocomplete>
      </div>
      <!-- Conditionally render the logout button -->
      <v-btn v-if="showLogoutButton" href="/logout" class="logout-button">Logout</v-btn>

      <template v-slot:extension>
        <v-tabs v-model="tab" align-tabs="title">
          <v-tab v-for="item in tabItems" :key="item" :value="item">
            {{ item }}
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>

    <!-- API Error Message -->
    <div v-if="apiError && !signInRequired" class="error-message" v-html="apiError"></div>
    <div v-if="signInRequired" class="github-login-container">
      <a href="/login" class="github-login-button">
        <v-icon left>mdi-github</v-icon>
        Sign in with GitHub
      </a>
    </div>
    <div v-if="!apiError">
      <v-progress-linear v-if="!metricsReady" indeterminate color="indigo"></v-progress-linear>
      <v-window v-if="metricsReady" v-model="tab">
        <v-window-item v-for="item in tabItems" :key="item" :value="item">
          <v-card flat>
            <MetricsViewer v-if="item === itemName" :metrics="metrics" />
            <BreakdownComponent v-if="item === 'languages'" :metrics="metrics" :breakdownKey="'language'" />
            <BreakdownComponent v-if="item === 'editors'" :metrics="metrics" :breakdownKey="'editor'" />
            <CopilotChatViewer v-if="item === 'copilot chat'" :metrics="metrics" />
            <SeatsAnalysisViewer v-if="item === 'seat analysis'" :seats="seats" />
            <ApiResponse v-if="item === 'api response'" :metrics="metrics" :seats="seats" />
          </v-card>
        </v-window-item>
      </v-window>
    </div>

  </v-card>
</template>

<script lang='ts'>
import { defineComponent, ref } from 'vue'
import { getMetricsApi } from '../api/GitHubApi';
import { getTeamMetricsApi } from '../api/GitHubApi';
import { getSeatsApi } from '../api/ExtractSeats';
import { Metrics } from '../model/Metrics';
import { Seat } from "../model/Seat";
import { GHOrgs } from '@/model/GHOrgs';
import { GHOrg } from '@/model/GHOrgs';
import { GHTeam } from '@/model/GHTeams';
import { GHTeams } from '@/model/GHTeams';

//Components
import MetricsViewer from './MetricsViewer.vue'
import BreakdownComponent from './BreakdownComponent.vue' 
import CopilotChatViewer from './CopilotChatViewer.vue' 
import SeatsAnalysisViewer from './SeatsAnalysisViewer.vue'
import ApiResponse from './ApiResponse.vue'
import config from '../config';
//import { changeOrg } from '../config';
import { getOrgs } from '../api/GitHubApi';
import { getTeamsForOrg } from '../api/GitHubApi';
import { text } from 'express';

export default defineComponent({
  name: 'MainComponent',
  components: {
    MetricsViewer,
    BreakdownComponent,
    CopilotChatViewer,
    SeatsAnalysisViewer,
    ApiResponse
  },
  computed: {

    gitHubOrgName() {
      return config.github.org;
    },
    gitHubOrgNames() {
      return config.github.orgs;
    },

    //add the orgs names to the view
    displayViewOrgsName(): string[] {
      return config.github.orgs;
    }
    ,
    teamName() {
      var teamName;
      if (config.github.team && config.github.team.trim() !== '') {
        teamName = "| Team : " + config.github.team;
      } else {
        teamName = '';
      }
      return teamName;
    },
    mockedDataMessage() {
      return config.mockedData ? 'Using mock data - see README if unintended' : '';
    },
    showLogoutButton() {
      return config.github.baseApi === '/api/github';
    },
     loadOrgsName(){
      return config.github.allGithubOrgs;
     }
  },
  data () {
    return {
      tabItems: ['languages', 'editors', 'copilot chat', 'seat analysis', 'api response'],
      tab: null,
      currentOrg: config.github.allGithubOrgs,
      itemName: 'Enterprises',
      allItems: [] as any[][] ,
    }
  },
  created() {
    this.tabItems.unshift(this.itemName);
  },
  methods: {
    handleOrgChange(newValue: string) {
      config.changeCurrentOrg(newValue);
      config.changeCurrentTeam(config.github.currentSelTeams[0]);
      this.$forceUpdate();
      this.dataUpdate();
    },
    dataUpdate() {      
      // if config.currentselectteam is 'ALL', then get the metrics for all the teams in the org
      // swtich to orgs get the metrics
    },
    setOrgs(stringOrgs: string[]) {
      this.allItems = [stringOrgs];
    }
  },
  setup() {
    const metricsReady = ref(false);
    const metrics = ref<Metrics[]>([]);
    const seatsReady = ref(false); 
    const seats = ref<Seat[]>([]); 
    const apiError = ref<string | undefined>(undefined);
    const signInRequired = ref(false);
    const userOrgs = ref<GHOrgs>();

    //define the initlization: get the orgs contents then init config.github.allGithubOrgs 
    // and get the teams contents for each orgs then init config.github.allGithubTeams
    const initOrgsTeams = async () => {
      //get the orgs with the function : getorgs from githubapi.ts and store to a GHOrgs object
      let orgs = await getOrgs();
      let orgs_strings: string[] = [];
      let teams_strings: string[] = [];
      //if config.github.ent is empty or null, 
      // then insert with Ent:enterprieName  into config.github.allGithubOrgs in the beginning
      if (config.github.ent && config.github.ent !== '') {
        orgs_strings.push('Ent-'+config.github.ent);
        teams_strings.push(config.github.ent+':ALL');
      }
      //get the org names from the GHOrgs object and contact it to a string seperate by '|';
      // and then get the teams information for each orgs with the function : getTeamsForOrg from githubapi.ts
      // and store the teams information to a GHTeams object
      for (let i = 0; i < orgs.orgs.length; i++) {
        orgs_strings.push(orgs.orgs[i].login);
        let nowteams_string = orgs.orgs[i].login + ':ALL|'; 
        let teams = await getTeamsForOrg(orgs.orgs[i].login);
        teams.teams.forEach((team: GHTeam):void => {
          nowteams_string += team.name + '|';
        });
        nowteams_string = nowteams_string.slice(0, -1);//remove the last '|'    
        teams_strings.push(nowteams_string);
      }

    //init the orgs and teams information to the config object
    config.initORgs_Teams(orgs_strings, teams_strings);
    if(config.isMSFT) {
      config.github.allGithubOrgs = config.github.allGithubOrgs.filter(org => org !== 'MicrosoftCopilot');
      config.github.allGithubTeams = config.github.allGithubTeams.filter(team => team.startsWith('MicrosoftCopilot') === false);
    }
    config.changeCurrentOrg(config.github.allGithubOrgs[0]);
    config.orgsTeamsInited = true;
     
  };
    
    const processError = (error: any) => {
      console.log(error);
      if (error.response && error.response.status) {
        switch (error.response.status) {
          case 401:
            apiError.value = '401 Unauthorized access - check if your token in the .env file is correct.';
            if (config.github.baseApi === '/api/github') {
              signInRequired.value = true;
            }
            break;
          case 404:
            apiError.value = `404 Not Found - is the right correct correct?`;
            apiError.value = error.message;
        }
        apiError.value += ' <br> If .env file is modified, restart the app for the changes to take effect.';
      }
    };
    //console.log(ref(config.github.allGithubOrgs));
   

    const refreshData = async () => {
      try {
        // Reset error states
        apiError.value = undefined;
        signInRequired.value = false;

        // Fetch metrics based on team configuration
        let entAndORg = false;
        if (config.github.currentSelOrg.startsWith('Ent-')) {
          // this is the configuration for enterprise
          const entName = config.github.currentSelOrg.split('-')[1];
          //https://api.github.com/enterprises/JumpStarGroup/copilot/usage
          config.github.apiUrl = config.github.baseApi + '/enterprises/' + entName;
          entAndORg = true;
        } else if(config.github.currentSelTeam !== 'ALL') {
          // this is the configuration for a specific team in selected org
          //https://api.github.com/orgs/CopilotNext/team/Dewu/copilot/usage
          config.github.apiUrl = config.github.baseApi + '/orgs/' + config.github.currentSelOrg + '/team/' + config.github.currentSelTeam;
        } else {
          // this is the configuration for all teams in selected org
          //https://api.github.com/orgs/CopilotNext/copilot/usage
          config.github.apiUrl = config.github.baseApi + '/orgs/' + config.github.currentSelOrg;
          entAndORg = true;
        }
        if (!entAndORg) {
          metrics.value = await getTeamMetricsApi();
          console.log('metrics:', metrics.value);
        } else {
          metrics.value = await getMetricsApi();
          console.log('metrics:', metrics.value);
        }
        metricsReady.value = true;
        // Fetch seats data
        seats.value = await getSeatsApi();
        seatsReady.value = true;
      } catch (error) {
        processError(error);
      }
      //udpate all the viewer components - MetricsViewer,BreakdownComponent,CopilotChatViewer,SeatsAnalysisViewer
      if(MetricsViewer) {
        //refresh the MetricsViewer
        
      }
    

    };
    //refreshData should be waiting for executing of initOrgsTeams
    Promise.resolve(initOrgsTeams()).then(() => {
      refreshData();
    }); 
    
    return { 
      metricsReady, 
      metrics, 
      seatsReady, 
      seats, 
      apiError, 
      signInRequired,
      userOrgs, // Add to returned object
    };
  }
})
</script>

<style scoped>
.toolbar-title {
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;

}
.error-message {
  color: red;
}
.logout-button {
  margin-left: auto;
}
.github-login-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.github-login-button {
  display: flex;
  align-items: center;
  background-color: #24292e;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
}
.github-login-button:hover {
  background-color: #444d56;
}
.github-login-button v-icon {
  margin-right: 8px;
}
</style>