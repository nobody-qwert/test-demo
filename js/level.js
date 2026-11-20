window.MARIO = window.MARIO || {};

// Build a single-level map as uniform-width strings so every column aligns perfectly.
// Legend: '#' ground  'B' brick  '=' platform  'C' coin  'E' walker spawn
//         'P' pipe body  'T' pipe cap/top  '|' flag pole  'F' flag top  'S' start  '.' empty
(() => {
  const W = 150, H = 15;                 // fixed grid size -> perfect column alignment
  const g = Array.from({length:H}, () => new Array(W).fill('.'));

  function set(x,y,ch){ if(x>=0&&x<W&&y>=0&&y<H) g[y][x]=ch; }
  function hLine(y,x0,x1,ch='#'){ for(let x=x0;x<=x1;x++) set(x,y,ch); }
  function gap(y,x0,x1){ hLine(y,x0,x1,'.'); }            // carve a pit through ground
  function col(x,y0,y1,ch='#'){ for(let y=y0;y<=y1;y++) set(x,y,ch); }
  function box(x0,y0,x1,y1,ch){ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)set(x,y,ch); }

  // ---- base ground floor on rows 13-14 (bottom two rows are solid) ----
  hLine(13,0,W-1,'#');
  hLine(14,0,W-1,'#');

  // ---- pits (gaps in the floor) ----
  gap(13, 20,22); gap(14,20,22);        // pit 1
  gap(13, 44,47); gap(14,44,47);        // pit 2 (wider)
  gap(13, 70,73); gap(14,70,73);        // pit 3
  gap(13, 100,104); gap(14,100,104);    // big pit before finale
  gap(13, 122,125); gap(14,122,125);    // late pit

  // ---- stepped hills (raised ground blocks) ----
  box(28,12,33,12,'#');                  // small hill
  box(52,11,60,11,'#'); box(53,10,58,10,'#');   // taller double-step hill
  box(80,12,86,12,'#');                  // mid hill

  // ---- floating brick platforms & coins above them ----
  hLine(9, 30,34,'B');
  hLine(9, 55,59,'B');
  hLine(8, 31,33,'C');                   // coins over bricks
  hLine(8, 56,58,'C');
  hLine(10, 63,67,'=');                  // high one-way-ish platform run
  hLine(9, 64,66,'C');
  hLine(11, 75,79,'B');
  hLine(10, 76,78,'C');

  // ---- pipes (two-wide, several tall) standing on the ground floor (row 12) ----
  // Cap uses its OWN char 'T' so it isn't confused with the flagpole '|'.
  function pipe(baseX, height){
    const topY = 12 - height + 1;
    col(baseX,   topY+1, 12, 'P');      // body columns
    col(baseX+1, topY+1, 12, 'P');
    set(baseX,   topY, 'T');             // flared cap on top row
    set(baseX+1, topY, 'T');
  }
  pipe(15, 3);     pipe(38, 4);   pipe(64, 3);   pipe(90, 5);   pipe(112, 4);   pipe(132, 3);

  // ---- scattered coins / arches ----
  [18, 27, 41, 42, 68, 95, 96, 97, 118].forEach((x,i)=> set(x, 10-(i%3), 'C'));
  hLine(7, 126,130,'C');                // coin arch near end
  set(127,6,'C'); set(128,6,'C'); set(129,6,'C');

  // ---- walkers (enemies) placed on ground/platforms ----
  set(25,12,'E'); set(49,12,'E'); set(66,12,'E'); set(84,12,'E');
  set(108,12,'E'); set(118,12,'E'); set(136,12,'E');

  // ---- flag at far right: a single-column pole resting on the ground floor ----
  const fx = W - 6;
  col(fx, 7, 12, '|');                  // pole body (rows 7..12, floor at row 13 below)
  set(fx, 6, 'F');                       // flag head at very top

  // ---- player start ----
  set(2, 12, 'S');

  const ROWS = g.map(r => r.join(''));   // all uniform width W by construction

  MARIO.Level = {
    ROWS,
    parse() {
      const T = MARIO.CONFIG.TILE;
      const solids=[], coins=[], walkers=[], flagPoles=[];   // poles are NOT solid
      let flag=null, playerStart={ x:T*2, y:12*T };
      ROWS.forEach((row,ry)=>{
        for(let rx=0;rx<row.length;rx++){
          const ch=row[rx], px=rx*T, py=ry*T;
          switch(ch){
            case '#': solids.push({x:px,y:py,w:T,h:T,type:'ground'}); break;
            case 'B': solids.push({x:px,y:py,w:T,h:T,type:'brick'}); break;
            case '=': solids.push({x:px,y:py,w:T,h:T,type:'platform'}); break;
            case 'P': solids.push({x:px,y:py,w:T,h:T,type:'pipe', cap:false}); break;
            case 'T': solids.push({x:px,y:py,w:T,h:T,type:'pipe', cap:true}); break;
            case '|': flagPoles.push({x:px,y:py,w:T,h:T}); break;   // decorative, walk-through
            case 'C': coins.push(new MARIO.Entities.Coin(rx,ry)); break;
            case 'E': walkers.push(new MARIO.Entities.Walker(px+4, py+(T-22), -1)); break;
            case 'F': if(!flag) flag=new MARIO.Entities.Flag(rx, ry); break;
            case 'S': playerStart={x:px+3, y:py+(T-30)}; break;
          }
        }
      });

      // Flag hitbox spans the whole pole column (tall), not just the top tile.
      if (flag) {
        const ftx = flag.tx, tty = flag.ty;
        flag.x = ftx * T; flag.y = tty * T;       // top of pole region
        flag.w = T; flag.h = T * 6;                // cover rows down toward ground
      }

      return { widthPx:W*T, heightPx:H*T, solids, coins, walkers, flag, flagPoles, playerStart };
    }
  };
})();
