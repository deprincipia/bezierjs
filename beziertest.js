var cvs = document.querySelector("canvas");
var lpts = [{x:120,y:160}, {x:32,y:200}, {x:220,y:260}, {x:220,y:40}];
var curve = new Bezier(lpts);
var t = 0.5, forward = true;

// helper function for drawing curves
var drawCurve = function(ctx, curve, offset) {
  offset = offset || { x:0, y:0 };
  var ox = offset.x;
  var oy = offset.y;
  var points = curve.getLUT(100);
  ctx.beginPath();
  var p = points[0], i;
  ctx.moveTo(p.x + ox, p.y + oy);
  for(i=1; i<points.length; i++) {
    p = points[i];
    ctx.lineTo(p.x + ox, p.y + oy);
  }
  ctx.stroke();
  ctx.closePath();
};


(function handleInteraction() {
  lpts = curve.points;
  var moving = false, mx = my = ox = oy = 0, cx, cy, mp = false;
  cvs.addEventListener("mousedown", function(evt) {
    mx = evt.offsetX;
    my = evt.offsetY;
    lpts.forEach(function(p) {
      if(Math.abs(mx-p.x)<10 && Math.abs(my-p.y)<10) {
        moving = true;
        mp = p;
        cx = p.x;
        cy = p.y;
      }
    });
  });
  cvs.addEventListener("mousemove", function(evt) {
    var found = false;
    lpts.forEach(function(p) {
      var mx = evt.offsetX;
      var my = evt.offsetY;
      if(Math.abs(mx-p.x)<10 && Math.abs(my-p.y)<10) {
        found = found || true;
      }
    });
    cvs.style.cursor = found ? "pointer" : "default";

    if(!moving) return;
    ox = evt.offsetX - mx;
    oy = evt.offsetY - my;
    mp.x = cx + ox;
    mp.y = cy + oy;
  });
  cvs.addEventListener("mouseup", function(evt) {
    if(!moving) return;

    moving = false;
    mp = false;
  });
}());


// this is where the Bezier object gets used.
(function split() {
  cvs.width = cvs.width;
  var ctx = cvs.getContext("2d");

  //
  // the curve, rendered as two subcurves split at "t"
  //
  var curves = curve.split(t);
  curves[0].color = "red";
  curves[1].color = "blue";
  curves.forEach(function(curve) {
    ctx.strokeStyle = curve.color;
    drawCurve(ctx, curve);
  });

  //
  // The control points
  //
  var s = curve.point(0),
      c1 = curve.point(1),
      c2 = curve.point(2),
      e = curve.point(3);

  ctx.strokeStyle = "grey";
  ctx.beginPath();
  ctx.moveTo(s.x,s.y);
  ctx.lineTo(c1.x,c1.y);
  ctx.arc(c1.x, c1.y, 2, 0, 2*Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.x,e.y);
  ctx.lineTo(c2.x,c2.y);
  ctx.arc(c2.x, c2.y, 2, 0, 2*Math.PI);
  ctx.stroke();


  //
  // the splitting point
  //
  c = curve.get(t);
  ctx.strokeStyle = "black";
  ctx.beginPath();
  ctx.arc(c.x, c.y, 5, 0, 2*Math.PI);
  ctx.stroke();

  var l=25;

  //
  // the "normalised" tangent vector at "t"
  //
  var d = curve.derivative(t);
  ctx.strokeStyle = "green";
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  var q = Math.sqrt(d.x*d.x + d.y*d.y)
  ctx.lineTo(c.x + l * d.x/q, c.y + l * d.y/q);
  ctx.stroke();

  //
  // the normal vector at "t"
  //
  var n = curve.normal(t);
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + l * n.x, c.y + l * n.y);
  ctx.stroke();

  // things involving roots MIGHT fail, so we try/catch wrap them
  (function() {
    //
    // All inflection points for the curve
    //
    var inflections = curve.inflections().values;
    ctx.strokeStyle = "purple";
    inflections.forEach(function(t) {
      c = curve.get(t);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, 2*Math.PI);
      ctx.stroke();
    });
    //
    // The curve's bounding box
    //
    ctx.strokeStyle = "rgba(255,0,0," + Math.max(0,t/3) + ")";
    var bbox = curve.bbox();
    ctx.beginPath();
    ctx.moveTo(bbox.x.min, bbox.y.min);
    ctx.lineTo(bbox.x.min, bbox.y.max);
    ctx.lineTo(bbox.x.max, bbox.y.max);
    ctx.lineTo(bbox.x.max, bbox.y.min);
    ctx.lineTo(bbox.x.min, bbox.y.min);
    ctx.stroke();
    //
    // The "offset curve", which is actually a poly-bezier
    //
    ctx.strokeStyle = "lightgrey";
    var reduced = curve.reduce();
    reduced.forEach(function(segment) {
      [-l/2, l].forEach(function(d) {
        var scaled = segment.scale(d);
        drawCurve(ctx, scaled);
        for(var t=0,p1,p2; t<=1; t++) {
          p1 = segment.get(t);
          p2 = scaled.get(t);
          ctx.beginPath();
          ctx.moveTo(p1.x,p1.y);
          ctx.lineTo(p2.x,p2.y);
          ctx.stroke();
        }
      })
    });
  }());

  //
  // Show the terminals, for good measure
  //
  ctx.strokeStyle = "red";
  ctx.beginPath();
  c = curve.get(0);
  ctx.arc(c.x, c.y, 2, 0, 2*Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "blue";
  ctx.beginPath();
  c = curve.get(1);
  ctx.arc(c.x, c.y, 2, 0, 2*Math.PI);
  ctx.stroke();

  (function drawOutline() {
    var outline = curve.outline(l, l/2),
        forward = outline["+"],
        back = outline["-"];

    ctx.strokeStyle = "rgb(50,20,0)";
    drawCurve(ctx, curve, {x:300,y:0});

    ctx.strokeStyle = "grey";
    ctx.fillStyle = "rgba(255,225,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(300 + forward[0].p.x, forward[0].p.y);
    for(var i=1, p1, p2, p3; i<forward.length; i+=3) {
      p1 = forward[i+0].p;
      p2 = forward[i+1].p;
      p3 = forward[i+2].p;
      ctx.bezierCurveTo(300 + p1.x, p1.y, 300 + p2.x, p2.y, 300 + p3.x, p3.y);
    }
    ctx.lineTo(300 + back[0].p.x, back[0].p.y);
    for(var i=1, p1, p2, p3; i<back.length; i+=3) {
      p1 = back[i].p;
      p2 = back[i+1].p;
      p3 = back[i+2].p;
      ctx.bezierCurveTo(300 + p1.x, p1.y, 300 + p2.x, p2.y, 300 + p3.x, p3.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }());

  if(false)
  (function() {
    // FIXME: code still finds overlaps in bits that should not count as overlapping
    var intersections = curve.intersects();
    console.log(intersections);
    intersections.forEach(function(v) {
      console.log(v);
      v.split("/").map(function(v) { return parseFloat(v); }).forEach(function(t) {
        var c = curve.get(t);
        console.log(c.x, c.y);
      });
    });
  }());

  // and then we just go draw the next frame.
  if (t>1) { forward = false; }
  if (t<0) { forward = true; }
  t = t + (forward? 1 : -1) * 0.01;
  setTimeout(split, 25);
}());
