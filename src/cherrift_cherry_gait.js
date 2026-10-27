/* Two planted contacts per walk cycle, using only the shipped leg artwork.
   Polygon masks isolate legs from skirts, hair, bows and Ninja's coat tails.
   Upper-body pixels are copied unchanged; generated concept art is not used. */
(() => {
  'use strict';
  if (window.CHERRIFT_CHERRY_GAIT) return;
  // Each leg is [hip x, hip y, sole x, sole y, outline]. Coordinates refer
  // to frame zero of the original right-hand walk direction.
  const rigs = {
    cherry_default: {
      down: [[93,145,97,182,[[84,143],[100,143],[105,164],[109,183],[88,185],[84,163]]], [106,145,108,163,[[100,143],[116,143],[116,160],[105,169],[99,159]]]],
      down_right: [[91,150,104,182,[[84,148],[99,148],[104,165],[119,178],[118,185],[100,185],[92,174]]], [78,149,75,162,[[66,146],[85,146],[88,158],[79,165],[68,165]]]],
      right: [[93,154,109,182,[[86,151],[100,150],[105,164],[122,173],[121,185],[105,185],[96,174]]], [80,154,66,181,[[73,151],[88,153],[77,167],[77,178],[68,185],[55,180],[58,168]]]],
      up_right: [[101,150,92,182,[[94,148],[109,150],[102,166],[103,180],[95,185],[80,180],[83,167]]], [119,149,122,162,[[112,147],[129,147],[129,160],[119,166],[110,158]]]],
      up: [[96,150,96,182,[[87,147],[103,147],[104,169],[106,185],[87,185],[87,166]]], [108,149,110,163,[[102,146],[117,146],[118,160],[110,167],[101,162]]]]
    },
    archer_cherry: {
      down: [[92,146,94,182,[[82,143],[101,144],[104,166],[105,185],[83,185],[81,162]]], [108,146,109,165,[[100,143],[120,144],[120,161],[111,169],[100,166]]]],
      down_right: [[91,157,107,183,[[84,153],[100,154],[105,168],[120,176],[119,186],[102,186],[93,177]]], [76,156,72,169,[[65,153],[83,153],[86,165],[78,173],[65,171]]]],
      right: [[95,160,111,183,[[87,156],[103,156],[107,167],[125,174],[124,186],[105,186],[96,176]]], [80,161,68,180,[[73,156],[88,158],[79,170],[80,179],[70,185],[57,179],[61,168]]]],
      up_right: [[96,151,85,182,[[88,147],[105,151],[99,167],[99,181],[89,186],[75,180],[79,164]]], [114,152,119,172,[[105,148],[122,148],[122,161],[131,167],[130,177],[112,178],[106,166]]]],
      up: [[96,150,96,183,[[85,146],[104,146],[106,166],[107,186],[84,186],[84,164]]], [106,150,110,169,[[101,146],[118,146],[119,165],[111,173],[101,169]]]]
    },
    ninja_cherry: {
      down: [[93,145,97,183,[[83,142],[104,143],[108,165],[111,185],[87,185],[82,161]]], [111,145,114,165,[[104,142],[124,142],[124,161],[115,170],[103,166]]]],
      down_right: [[100,152,119,183,[[90,149],[111,149],[115,163],[135,174],[135,186],[112,186],[102,177]]], [84,150,78,167,[[74,146],[92,147],[93,160],[85,172],[71,169],[69,158]]]],
      right: [[108,146,131,182,[[97,142],[117,142],[121,160],[146,169],[147,181],[126,185],[111,174]]], [91,148,87,181,[[82,143],[102,147],[95,162],[100,177],[95,185],[73,182],[74,169]]]],
      up_right: [[100,147,103,182,[[90,143],[110,143],[112,163],[119,175],[116,186],[93,186],[91,166]]], [86,148,77,166,[[76,144],[95,145],[90,160],[81,173],[69,169],[70,157]]]],
      up: [[95,145,97,183,[[84,141],[105,141],[109,165],[110,186],[86,186],[83,161]]], [112,145,113,165,[[104,141],[124,142],[124,160],[115,171],[104,167]]]]
    }
  };
  const cache = new WeakMap();
  const mirrored = {left:'right', down_left:'down_right', up_left:'up_right'};
  function polygon(ctx, points) {
    ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
  }
  function canvas() { const c=document.createElement('canvas'); c.width=c.height=192; return c; }
  function create(image, id, direction, geometry, sourceFrame, requestedFrame) {
    const mirror = !!mirrored[direction], dir=mirrored[direction] || direction;
    const rig = rigs[id]?.[dir];
    if (!rig || !geometry || typeof document === 'undefined') return null;
    // Mirrored source strips use a 1px offset in the original export.
    const legs = rig.map(([hx,hy,fx,fy,points]) => {
      const convertX = x => mirror ? 192-x : x;
      return {hx:convertX(hx),hy,fx:convertX(fx),fy,
        points:points.map(([x,y]) => [convertX(x),y])};
    });
    const walkGeometry=window.CHERRIFT_CHERRY_GEOMETRY?.[id]?.walk?.[direction]?.[0];
    if (walkGeometry) {
      const scale=(geometry[1]-geometry[0])/(walkGeometry[1]-walkGeometry[0]);
      const tx=x=>(x-walkGeometry[2])*scale+geometry[2];
      const ty=y=>(y-walkGeometry[1])*scale+geometry[1];
      for (const leg of legs) {
        leg.hx=tx(leg.hx);leg.fx=tx(leg.fx);leg.hy=ty(leg.hy);leg.fy=ty(leg.fy);
        leg.points=leg.points.map(([x,y])=>[tx(x),ty(y)]);
      }
    }
    const body=canvas(), b=body.getContext('2d');
    b.drawImage(image,sourceFrame*192,0,192,192,0,0,192,192);
    const layers=legs.map(leg => {
      const c=canvas(),ctx=c.getContext('2d');
      ctx.save(); polygon(ctx,leg.points); ctx.clip();
      ctx.drawImage(body,0,0); ctx.restore();
      return c;
    });
    b.save(); b.globalCompositeOperation='destination-out';
    for (const leg of legs) {polygon(b,leg.points); b.fill();}
    b.restore();
    const side = dir === 'right';
    const diagonal = dir.includes('_');
    const axis=(legs[0].hx+legs[1].hx)/2;
    for (const frame of [requestedFrame]) {
      const out=canvas(),ctx=out.getContext('2d');
      const phase=Math.cos(frame*Math.PI/3);
      const poses=[0,1].map(i=>({i,contact:phase*(i===0?1:-1)}))
        .sort((a,b)=>a.contact-b.contact);
      for(const {i,contact} of poses) {
        // Reuse the intact leg from this original frame for the formerly
        // occluded rear contact. Rigid transforms preserve its drawn anatomy.
        const source=side?i:0, leg=legs[source];
        const rootX=side?legs[i].hx:axis+(mirror?-1:1)*(i===0?-5:5);
        const rootY=legs[i].hy;
        const angle=Math.atan2(leg.fx-leg.hx,leg.fy-leg.hy);
        const desired=(mirror?-1:1)*(side ? .42 : diagonal ? .24 : .07)*contact;
        const scale=side ? .94+.06*contact : .84+.16*contact;
        ctx.save();ctx.translate(rootX,rootY);
        ctx.rotate(angle-desired);
        ctx.scale(scale,scale);
        ctx.translate(-leg.hx,-leg.hy);
        ctx.drawImage(layers[source],0,0);ctx.restore();
      }
      ctx.drawImage(body,0,0);
      return out;
    }
    return null;
  }
  function get(image,id,dir,frame,geometry,sourceFrame=0) {
    let variants=cache.get(image);
    if (!variants) {variants=new Map();cache.set(image,variants);}
    const key=sourceFrame*6+frame%6;
    if (!variants.has(key)) {
      // Bound each strip to six small canvases on mobile. Source images remain
      // owned by the existing asset loader; no extra network requests.
      if(variants.size>=6) variants.delete(variants.keys().next().value);
      variants.set(key,create(image,id,dir,geometry,sourceFrame,frame%6));
    }
    return variants.get(key) || null;
  }
  window.CHERRIFT_CHERRY_GAIT=Object.freeze({get});
})();
