/**
 * Builds a single-line bookmarklet URI that extracts product URL, title,
 * and price from the currently open store page and opens /quick-add.
 */
export function buildBookmarkletCode(origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, "");

  const script = `(function(){
    var u=location.href,t=document.title,p='';
    try{
      var lds=document.querySelectorAll('script[type="application/ld+json"]');
      for(var i=0;i<lds.length;i++){
        var d=JSON.parse(lds[i].textContent||'{}');
        var arr=Array.isArray(d)?d:[d];
        for(var j=0;j<arr.length;j++){
          var o=arr[j]&&arr[j].offers;
          if(o){var f=Array.isArray(o)?o[0]:o;if(f&&(f.price||f.lowPrice)){p=String(f.price||f.lowPrice);break;}}
        }
        if(p)break;
      }
    }catch(e){}
    if(!p){
      var m=document.querySelector('meta[property="product:price:amount"],meta[property="og:price:amount"]');
      if(m)p=m.getAttribute('content')||'';
    }
    if(!p){
      var sels=[
        '#corePrice_feature_div .a-offscreen',
        '.a-price .a-offscreen',
        '.andes-money-amount__fraction',
        '[data-testid="price-value"]',
        'h4.finalPrice',
        '[class*="price"]'
      ];
      for(var k=0;k<sels.length;k++){
        var el=document.querySelector(sels[k]);
        if(el&&el.textContent){
          var txt=el.textContent.replace(/[^0-9.,]/g,'').trim();
          if(txt){p=txt;break;}
        }
      }
    }
    var target='${cleanOrigin}/quick-add?url='+encodeURIComponent(u)+'&title='+encodeURIComponent(t)+'&price='+encodeURIComponent(p);
    window.open(target,'precocraft_quick_add','width=520,height=720,noopener');
  })();`;

  return "javascript:" + script.replace(/\s+/g, " ").trim();
}
