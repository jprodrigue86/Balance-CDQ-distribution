// Isolated CDQ trial renderer: replace a neutral rectangular stroke at draw time.
// No overlay, erasure, document mutation or change to saved PDF geometry.
export function rectangleBounds(data){
 if(!data || !ArrayBuffer.isView(data) && !Array.isArray(data))return null;
 const points=[];let closed=false;
 for(let i=0;i<data.length;){const op=data[i++];if(op===0||op===1){if(i+1>=data.length)return null;points.push([data[i++],data[i++]]);}else if(op===4)closed=true;else return null;}
 if(points.length===5&&points[0][0]===points[4][0]&&points[0][1]===points[4][1])points.pop();
 if(!closed||points.length!==4)return null;
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 if(box[0]===box[2]||box[1]===box[3])return null;
 for(let i=0;i<4;i++){const p=points[i],q=points[(i+1)%4];if((p[0]!==q[0]&&p[1]!==q[1])||!(p[0]===box[0]||p[0]===box[2])||!(p[1]===box[1]||p[1]===box[3]))return null;}
 return box;
}
export function pixelFrame(box,m,width){
 if(Math.abs(m.b)>1e-8||Math.abs(m.c)>1e-8||Math.abs(Math.abs(m.a)-Math.abs(m.d))>0.02)return null;
 const x=[m.a*box[0]+m.e,m.a*box[2]+m.e],y=[m.d*box[1]+m.f,m.d*box[3]+m.f];
 const t=Math.max(1,Math.round(width*(Math.abs(m.a)+Math.abs(m.d))/2));
 const l=Math.round(Math.min(...x)-t/2),r=Math.round(Math.max(...x)+t/2),top=Math.round(Math.min(...y)-t/2),bottom=Math.round(Math.max(...y)+t/2);
 if(r-l<2*t||bottom-top<2*t)return null;
 return [[l,top,r-l,t],[l,bottom-t,r-l,t],[l,top+t,t,bottom-top-2*t],[r-t,top+t,t,bottom-top-2*t]];
}
export function paintCrispFrame(ctx,box,width,color){
 if(!box||Math.abs(width-.6)>1e-5||!['#6eb8c9','#6eb8ca','#6eb7c9','#6eb8c9ff','rgb(110, 184, 201)'].includes(String(color).toLowerCase()))return false;
 const rects=pixelFrame(box,ctx.getTransform(),width);if(!rects)return false;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=color;for(const r of rects)ctx.fillRect(...r);ctx.restore();return true;
}
