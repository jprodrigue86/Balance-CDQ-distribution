// Metadata can select blank static artwork only after its exact serialized
// bytes and current opening epoch have independently been authenticated.
const algorithm='cdq-static-artwork-graph-sha256-v1',sha=/^[a-f0-9]{64}$/;
export function validatedReaderStaticArtworkV2753(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {algorithmVersion,fingerprint,pageIndex,pageCount,bytesSha256,bytesLength}=value;
 if(algorithmVersion!==algorithm||typeof fingerprint!=='string'||!sha.test(fingerprint)||typeof bytesSha256!=='string'||!sha.test(bytesSha256)||pageIndex!==0||pageCount!==1||!Number.isSafeInteger(bytesLength)||bytesLength<8||bytesLength>32*1024*1024)return null;
 return {algorithmVersion:algorithm,fingerprint,pageIndex:0,pageCount:1,bytesSha256,bytesLength};
}
export function matchReaderStaticArtworkV2753(value,{bytesSha256,bytesLength}={}){
 const valid=validatedReaderStaticArtworkV2753(value);
 return valid&&valid.bytesSha256===bytesSha256&&valid.bytesLength===bytesLength?valid:null;
}
