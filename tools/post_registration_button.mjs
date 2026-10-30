// Run locally with DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID, and optionally
// CHERRIFT_REGISTRATION_MESSAGE in environment. Never commit credentials.
const bot=process.env.DISCORD_BOT_TOKEN;
const channel=process.env.DISCORD_CHANNEL_ID;
if(!bot || !/^\d{15,25}$/.test(channel||'')){
 console.error('Set DISCORD_BOT_TOKEN and a valid DISCORD_CHANNEL_ID in environment.');process.exit(1);
}
const body={content:(process.env.CHERRIFT_REGISTRATION_MESSAGE||'CHERRIFT Closed Beta is accepting registrations.').slice(0,1800),allowed_mentions:{parse:[]},components:[{type:1,components:[
 {type:2,style:3,label:'Register for Closed Beta',custom_id:'cherrift_beta_register',emoji:{name:'🌸'}},
 {type:2,style:2,label:'Check Status',custom_id:'cherrift_beta_status'},
 {type:2,style:4,label:'Unregister',custom_id:'cherrift_beta_unregister'}
]}]};
const res=await fetch(`https://discord.com/api/v10/channels/${channel}/messages`,{method:'POST',headers:{Authorization:`Bot ${bot}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
if(!res.ok){console.error('Discord API error',res.status,(await res.text()).slice(0,300));process.exitCode=1;}else{const out=await res.json();console.log('Created registration message:',out.id);}
