import assert from 'node:assert/strict';
import test from 'node:test';
import { positionTour } from '../lib/investor-onboarding/tour.ts';

test('a phone tour keeps the card and spotlight visible without covering the highlighted area',()=>{
  const layout=positionTour({left:16,top:100,right:374,bottom:1500},{width:390,height:844},{width:358,height:290});
  assert.ok(layout.card.left>=16);
  assert.ok(layout.card.top+290<=844-16);
  assert.ok(layout.spotlight.top>=96);
  assert.ok(layout.spotlight.top+layout.spotlight.height<=layout.card.top-12);
  assert.ok(layout.spotlight.left+layout.spotlight.width<=390-12);
});
test('desktop file workspace places the tour beside the highlighted documents',()=>{
  const layout=positionTour({left:32,top:100,right:422,bottom:1000},{width:1280,height:720},{width:360,height:280});
  assert.ok(layout.card.left>=422+12);
  assert.ok(layout.card.top+280<=720-16);
});
test('the upload portal uses the free space on its left for the tutorial',()=>{
  const layout=positionTour({left:450,top:110,right:1218,bottom:420},{width:1280,height:720},{width:360,height:280});
  assert.ok(layout.card.left+360<=450-12);
});
test('full-width evaluation evidence places the card below the highlighted report',()=>{
  const layout=positionTour({left:60,top:100,right:1220,bottom:230},{width:1280,height:720},{width:360,height:280});
  assert.ok(layout.card.top>=layout.spotlight.top+layout.spotlight.height+12);
});
test('a short viewport clips the spotlight and keeps the tour card inside the screen',()=>{
  const layout=positionTour({left:-10,top:100,right:410,bottom:1800},{width:390,height:568},{width:358,height:330});
  assert.ok(layout.card.top>=16);
  assert.ok(layout.spotlight.width>0);
  assert.ok(layout.spotlight.height>0);
  assert.ok(layout.card.left+358<=390-16);
});
test('a crowded screen omits an unusably small spotlight rather than highlighting a sliver',()=>{
  const layout=positionTour({left:16,top:105,right:374,bottom:1800},{width:390,height:568},{width:358,height:434});
  assert.equal(layout.spotlight,null);
  assert.ok(layout.card.top>=16);
});
