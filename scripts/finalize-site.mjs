import {execFileSync} from 'node:child_process';
import {buildOffline} from './offline.mjs';
await buildOffline('dist',{commit:process.env.COURSE_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:execFileSync('git',['show','-s','--format=%cs','HEAD'],{encoding:'utf8'}).trim()});
