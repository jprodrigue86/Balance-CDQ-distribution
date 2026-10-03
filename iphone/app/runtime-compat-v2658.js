/* PDF.js 6 on installed Android WebViews and earlier Chromium releases. */
(()=>{
  if(typeof Math.sumPrecise!=='function')Object.defineProperty(Math,'sumPrecise',{configurable:true,writable:true,value:function(values){
    let sum=0,correction=0,count=0,positiveInfinity=false,negativeInfinity=false,nan=false,negativeZero=true;
    for(const value of values){
      if(typeof value!=='number')throw new TypeError('Expected numeric values');
      count++;negativeZero=negativeZero&&Object.is(value,-0);
      if(Number.isNaN(value)){nan=true;continue;}
      if(value===Infinity){positiveInfinity=true;continue;}if(value===-Infinity){negativeInfinity=true;continue;}
      const next=sum+value;
      if(Number.isFinite(next))correction+=Math.abs(sum)>=Math.abs(value)?(sum-next)+value:(value-next)+sum;
      sum=next;
    }
    if(nan||(positiveInfinity&&negativeInfinity))return NaN;
    if(positiveInfinity)return Infinity;if(negativeInfinity)return -Infinity;
    const result=sum+correction;return result===0&&(!count||negativeZero)?-0:result;
  }});
  for(const Constructor of [Map,WeakMap]){
    if(typeof Constructor.prototype.getOrInsertComputed!=='function')
      Object.defineProperty(Constructor.prototype,'getOrInsertComputed',{configurable:true,writable:true,value:function(key,callback){
        if(typeof callback!=='function')throw new TypeError('Expected a callback');
        if(this.has(key))return this.get(key);
        const value=callback(key);this.set(key,value);return value;
      }});
    if(typeof Constructor.prototype.getOrInsert!=='function')
      Object.defineProperty(Constructor.prototype,'getOrInsert',{configurable:true,writable:true,value:function(key,value){
        if(this.has(key))return this.get(key);this.set(key,value);return value;
      }});
  }
})();
