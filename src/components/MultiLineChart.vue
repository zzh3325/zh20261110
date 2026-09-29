<template>
  <view class="chart-card">
    <view class="row between chart-head"><view><view class="strong">{{ title }}</view><view class="muted unit">单位：{{ unit }}</view></view><view class="pill">{{ pointCount }} 点</view></view>
    <view class="legend">
      <view v-for="item in series" :key="item.key" class="legend-item" :class="{disabled:!visible.includes(item.key)}" @click="toggle(item.key)"><text :style="{background:item.color}" />{{ item.label }}</view>
    </view>
    <canvas :id="canvasId" :canvas-id="canvasId" class="chart" @touchend="selectAt" />
    <view v-if="selectedTime" class="selected">
      <view class="strong selected-time">{{ selectedTime }}</view>
      <view class="selected-values"><view v-for="item in selectedValues" :key="item.key"><text :style="{background:item.color}" />{{ item.label }}：{{ item.value }} {{ unit }}</view></view>
    </view>
    <view class="muted hint">点击图例可隐藏曲线，轻触曲线区域可查看对应时刻数值。</view>
  </view>
</template>

<script setup lang="ts">
import { computed,getCurrentInstance,nextTick,onMounted,ref,watch } from 'vue'
export interface LinePoint {time:string;value:number|null}
export interface LineSeries {key:string;label:string;color:string;points:LinePoint[]}
const props=defineProps<{title:string;unit:string;series:LineSeries[]}>()
const canvasId='multi-line-'+Math.random().toString(36).slice(2),instance=getCurrentInstance(),visible=ref<string[]>([]),selectedIndex=ref(-1)
let width=0,height=0
const activeSeries=computed(()=>props.series.filter(item=>visible.value.includes(item.key)))
const pointCount=computed(()=>Math.max(0,...props.series.map(item=>item.points.length)))
const selectedTime=computed(()=>selectedIndex.value<0?'':activeSeries.value.find(item=>item.points[selectedIndex.value])?.points[selectedIndex.value]?.time||'')
const selectedValues=computed(()=>activeSeries.value.map(item=>({key:item.key,label:item.label,color:item.color,value:format(item.points[selectedIndex.value]?.value)})))
function format(value:number|null|undefined){if(value===null||value===undefined||!Number.isFinite(value))return '--';return Math.abs(value)>=1000?value.toFixed(0):Math.abs(value)>=100?value.toFixed(1):value.toFixed(2)}
function toggle(key:string){visible.value=visible.value.includes(key)?visible.value.filter(item=>item!==key):[...visible.value,key];selectedIndex.value=-1;draw()}
function measure(){nextTick(()=>{uni.createSelectorQuery().in(instance?.proxy).select('#'+canvasId).boundingClientRect(rect=>{const box=rect as UniApp.NodeInfo;if(!box?.width)return;width=Number(box.width);height=Number(box.height);draw()}).exec()})}
function draw(){if(!width||!height)return;const ctx=uni.createCanvasContext(canvasId,instance?.proxy as any),left=42,right=12,top=18,bottom=35,plotW=width-left-right,plotH=height-top-bottom;ctx.clearRect(0,0,width,height);ctx.setFontSize(10);ctx.setFillStyle('#7b8b88');const values=activeSeries.value.flatMap(item=>item.points.map(point=>point.value).filter((value):value is number=>value!==null&&Number.isFinite(value)));if(!values.length){ctx.setTextAlign('center');ctx.fillText('当前指标没有可绘制数值',width/2,height/2);ctx.draw();return}let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.abs(min||1)*.05||1;min-=pad;max+=pad}const range=max-min;ctx.setStrokeStyle('#dfe9e7');ctx.setLineWidth(1);ctx.setTextAlign('right');for(let i=0;i<5;i++){const y=top+plotH*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.setFillStyle('#7b8b88');ctx.fillText(format(max-range*i/4),left-5,y+3)}const count=pointCount.value;for(const item of activeSeries.value){ctx.beginPath();ctx.setStrokeStyle(item.color);ctx.setLineWidth(2);let started=false;item.points.forEach((point,index)=>{if(point.value===null||!Number.isFinite(point.value))return;const x=left+(count<=1?0:index/(count-1)*plotW),y=top+(max-point.value)/range*plotH;if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y)});ctx.stroke()}ctx.setTextAlign('left');ctx.setFillStyle('#7b8b88');const first=activeSeries.value[0]?.points[0]?.time||'',last=activeSeries.value[0]?.points[count-1]?.time||'';ctx.fillText(shortTime(first),left,height-8);ctx.setTextAlign('right');ctx.fillText(shortTime(last),width-right,height-8);if(selectedIndex.value>=0&&count){const x=left+(count<=1?0:selectedIndex.value/(count-1)*plotW);ctx.setStrokeStyle('#60716e');ctx.setLineWidth(1);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();for(const item of activeSeries.value){const value=item.points[selectedIndex.value]?.value;if(value===null||value===undefined)continue;const y=top+(max-value)/range*plotH;ctx.setFillStyle(item.color);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}}ctx.draw()}
function shortTime(value:string){return value?value.slice(5,16).replace('T',' '):'--'}
function selectAt(event:unknown){if(!pointCount.value)return;const touch=(event as {changedTouches?:Array<{x?:number;clientX?:number}>}).changedTouches?.[0];const x=Number(touch?.x??touch?.clientX);if(!Number.isFinite(x))return;const left=42,right=12;selectedIndex.value=Math.max(0,Math.min(pointCount.value-1,Math.round((x-left)/Math.max(width-left-right,1)*(pointCount.value-1))));draw()}
watch(()=>props.series,(series,previous)=>{
  const keys=series.map(item=>item.key),previousKeys=(previous||[]).map(item=>item.key)
  const groupChanged=keys.length!==previousKeys.length||keys.some((key,index)=>key!==previousKeys[index])
  visible.value=groupChanged?keys:keys.filter(key=>visible.value.includes(key))
  selectedIndex.value=-1
  measure()
},{deep:true,immediate:true})
onMounted(measure)
</script>

<style scoped>
.chart-card{background:#fff;border-radius:24rpx;padding:26rpx;margin-top:20rpx}.chart-head{gap:18rpx}.unit{font-size:21rpx;margin-top:5rpx}.legend{display:flex;flex-wrap:wrap;gap:12rpx 20rpx;margin:22rpx 0 8rpx}.legend-item{display:flex;align-items:center;font-size:21rpx;color:#425956}.legend-item text,.selected-values text{width:16rpx;height:16rpx;border-radius:50%;margin-right:7rpx}.legend-item.disabled{opacity:.35;text-decoration:line-through}.chart{width:100%;height:420rpx}.selected{padding:16rpx;background:#f0f7f5;border-radius:14rpx}.selected-time{font-size:21rpx}.selected-values{display:flex;flex-wrap:wrap;gap:10rpx 18rpx;margin-top:10rpx;font-size:20rpx}.selected-values view{display:flex;align-items:center}.hint{font-size:19rpx;line-height:1.6;margin-top:14rpx}
</style>
