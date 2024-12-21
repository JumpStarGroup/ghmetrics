<template>
  <div>
    <div class="tiles-container">
      <!-- Acceptance Rate Tile -->  
      <v-card elevation="4" color="white" variant="elevated" class="mx-auto my-3" style="width: 300px; height: 175px;">
          <v-card-item>
            <div class="tiles-text">
              <div class="spacing-25"></div>
              <div class="text-h6 mb-1">Number of {{ breakdownDisplayNamePlural }}</div>
              <div class="text-caption">
                Over the last 28 days
              </div>
              <p class="text-h4">{{ numberOfBreakdowns }}</p> 
          </div>
        </v-card-item>
      </v-card>
    </div>

    <v-main class="p-1" style="min-height: 300px;">
      <v-container style="min-height: 300px;" class="px-4 elevation-2">
        <v-row>
          <v-col cols="6">
            <v-card>
              <v-card-item class="d-flex justify-center align-center">
                <div class="spacing-25"></div>
                <div class="text-h6 mb-1">Top 5 {{ breakdownDisplayNamePlural }} by accepted prompts</div>
                <div style="width: 300px; height: 300px;">
                  <Pie :data="breakdownsChartDataTop5AcceptedPrompts" :options="chartOptions" />
                </div>
              </v-card-item>
            </v-card>
          </v-col>

          <v-col cols="6">
            <v-card>
              <v-card-item class="d-flex justify-center align-center">
                <div class="spacing-25"></div>
                <div class="text-h6 mb-1">Top 5 {{ breakdownDisplayNamePlural }} by acceptance rate</div>
                <div style="width: 300px; height: 300px;">
                  <Pie :data="breakdownsChartDataTop5AcceptanceRate" :options="chartOptions" />
                </div>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>

        <br>
        <h2>{{ breakdownDisplayNamePlural }} Breakdown </h2>
        <br>

        <v-data-table :headers="headers" :items="breakdownList" class="elevation-2" style="padding-left: 100px; padding-right: 100px;">
            <template v-slot:item="{item}">
                <tr>
                    <td>{{ item.name }}</td>
                    <td>{{ item.acceptedPrompts }}</td>
                    <td>{{ item.acceptedLinesOfCode }}</td>
                    <td v-if="item.acceptanceRate !== undefined">{{ item.acceptanceRate.toFixed(2) }}%</td>
                </tr>
            </template>
        </v-data-table>
      </v-container>
    </v-main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, toRef, watch, PropType } from 'vue';
import { Metrics } from '../model/Metrics';
import { Breakdown } from '../model/Breakdown';
import { Pie } from 'vue-chartjs'

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  ArcElement, 
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default defineComponent({
  name: 'BreakdownComponent',
  props: {
    metrics: {
      type: Array as PropType<Metrics[]>, // 修复类型定义
      required: true
    },
    breakdownKey: {
      type: String,
      required: true
    }
  },
  components: {
    Pie
  },
  computed: {
    breakdownDisplayName() {
      return this.breakdownKey.charAt(0).toUpperCase() + this.breakdownKey.slice(1);
    },
    breakdownDisplayNamePlural() {
      return `${this.breakdownDisplayName}s`;
    },
    headers() {
      return [
        { title: `${this.breakdownDisplayName} Name`, key: 'name' },
        { title: 'Accepted Prompts', key: 'acceptedPrompts' },
        { title: 'Accepted Lines of Code', key: 'acceptedLinesOfCode' },
        { title: 'Acceptance Rate (%)', key: 'acceptanceRate' },
      ];
    },
  },
  setup(props) {

    // 创建响应式引用
    const breakdownList = ref<Breakdown[]>([]);
    const numberOfBreakdowns = ref(0);
    const breakdownsChartData = ref<{ labels: string[]; datasets: any[] }>({ labels: [], datasets: [] });
    const breakdownsChartDataTop5AcceptedPrompts = ref<{ labels: string[]; datasets: any[] }>({ labels: [], datasets: [] });
    const breakdownsChartDataTop5AcceptanceRate = ref<{ labels: string[]; datasets: any[] }>({ labels: [], datasets: [] });

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
    };

    const pieChartColors = ref([
    '#4B0082', '#41B883', '#483D8B', '#87CEFA', 
    '#32CD32'
  ]);

    const data = toRef(props, 'metrics').value;

    // 修复数据处理逻辑
    const updateBreakdownData = (metricsData: Metrics[]) => {
      if (!Array.isArray(metricsData)) {
        console.error('Invalid metrics data:', metricsData);
        return;
      }

      try {
        // 重置数据
        breakdownList.value = [];

        // 处理数据
        metricsData.forEach((metric: Metrics) => {
          if (metric.breakdown) {
            metric.breakdown.forEach(breakdownData => {
              const breakdownName = breakdownData[props.breakdownKey as keyof typeof breakdownData] as string;
              let breakdown = breakdownList.value.find(b => b.name === breakdownName);

              if (!breakdown) {
                breakdown = new Breakdown({
                  name: breakdownName,
                  acceptedPrompts: breakdownData.acceptances_count,
                  suggestedLinesOfCode: breakdownData.lines_suggested,
                  acceptedLinesOfCode: breakdownData.lines_accepted,
                });
                breakdownList.value.push(breakdown);
              } else {
                breakdown.acceptedPrompts += breakdownData.acceptances_count;
                breakdown.suggestedLinesOfCode += breakdownData.lines_suggested;
                breakdown.acceptedLinesOfCode += breakdownData.lines_accepted;
              }
              
              breakdown.acceptanceRate = breakdown.suggestedLinesOfCode !== 0 ? 
                (breakdown.acceptedLinesOfCode / breakdown.suggestedLinesOfCode) * 100 : 0;
            });
          }
        });

        numberOfBreakdowns.value = breakdownList.value.length;
        updateCharts();
      } catch (error) {
        console.error('Error updating breakdown data:', error);
      }
    };

    // Add chart update function
    const updateCharts = () => {
      // Sort and get top 5 by acceptance rate
      const sortedByRate = [...breakdownList.value].sort((a, b) => b.acceptanceRate - a.acceptanceRate);
      const top5ByRate = sortedByRate.slice(0, 5);

      breakdownsChartDataTop5AcceptanceRate.value = {
        labels: top5ByRate.map(b => b.name),
        datasets: [{
          data: top5ByRate.map(b => b.acceptanceRate.toFixed(2)),
          backgroundColor: pieChartColors.value,
        }],
      };

      // Sort and get top 5 by accepted prompts
      const sortedByPrompts = [...breakdownList.value].sort((a, b) => b.acceptedPrompts - a.acceptedPrompts);
      const top5ByPrompts = sortedByPrompts.slice(0, 5);

      breakdownsChartDataTop5AcceptedPrompts.value = {
        labels: top5ByPrompts.map(b => b.name),
        datasets: [{
          data: top5ByPrompts.map(b => b.acceptedPrompts),
          backgroundColor: pieChartColors.value,
        }],
      };
    };

    // 添加监听器
    watch(
      () => props.metrics,
      (newMetrics) => {
        if (newMetrics && Array.isArray(newMetrics)) {
          updateBreakdownData(newMetrics);
        }
      },
      { immediate: true, deep: true }
    );

    return { chartOptions, breakdownList, numberOfBreakdowns, 
      breakdownsChartData, breakdownsChartDataTop5AcceptedPrompts, breakdownsChartDataTop5AcceptanceRate, updateBreakdownData };
  },
  

});
</script>
