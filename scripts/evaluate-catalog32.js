#!/usr/bin/env node
/** A deterministic offline ranking evaluation; no experiment assignment or tracking. */
import {all} from '../src/database.js';
import {compareRecommendationArms} from '../src/roadmap32.js';
const rows=all("SELECT v.id,v.channel_id AS channelId,v.views,v.status FROM videos v WHERE v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) LIMIT 250");
console.log(JSON.stringify(compareRecommendationArms(rows),null,2));
