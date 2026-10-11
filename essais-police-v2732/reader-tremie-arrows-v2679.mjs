// Filled, tapered ribbons follow two smooth cubic sides and end in sharp tips.
export function curvedTremieArrowV2679(sx,sy,tx,ty,{rear=false,left=true}={}){
 const sign=left?1:-1,headLength=5.4,headHalf=2.55,startHalf=1.65,endHalf=.65;
 const p0=[sx,sy],p1=rear?[sx+sign*10,sy-23]:[sx+sign*10,sy-5],p2=rear?[tx-sign*15,ty]:[tx-sign*8,ty-4],tip=[tx,ty];
 const normal=(a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],n=Math.hypot(x,y)||1;return [-y/n,x/n];};
 const n0=normal(p0,p1),n1=normal(p2,tip),dx=tip[0]-p2[0],dy=tip[1]-p2[1],length=Math.hypot(dx,dy)||1,base=[tx-dx/length*headLength,ty-dy/length*headLength];
 const offset=(p,n,w)=>[p[0]+n[0]*w,p[1]+n[1]*w],point=p=>p.map(x=>Number(x.toFixed(3))).join(' '),l1=offset(p1,n0,(startHalf*2+endHalf)/3),l2=offset(p2,n1,(startHalf+endHalf*2)/3),r1=offset(p1,n0,-(startHalf*2+endHalf)/3),r2=offset(p2,n1,-(startHalf+endHalf*2)/3);
 return '% curved-leg-v2679\nq .075 .22 .64 rg '+point(offset(p0,n0,startHalf))+' m '+point(l1)+' '+point(l2)+' '+point(offset(base,n1,endHalf))+' c '+point(offset(base,n1,headHalf))+' l '+point(tip)+' l '+point(offset(base,n1,-headHalf))+' l '+point(offset(base,n1,-endHalf))+' l '+point(r2)+' '+point(r1)+' '+point(offset(p0,n0,-startHalf))+' c h f Q\n';
}
