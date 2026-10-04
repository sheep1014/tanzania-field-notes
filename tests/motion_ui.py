import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
url='https://tanzania-field-notes.vercel.app/?v=motion-1'
with sync_playwright() as p:
 for engine in [p.webkit,p.chromium]:
  for reduced in [False,True]:
   b=engine.launch();page=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce' if reduced else 'no-preference')
   if '--local' in sys.argv:
    for name in ['index.html','app.js','styles.css']:
     pattern='**/app.js*' if name=='app.js' else '**/styles.css*' if name=='styles.css' else '**/?v=motion-1'
     page.route(pattern,lambda r,request,n=name:r.fulfill(body=Path(n).read_text(),content_type='text/html' if n.endswith('html') else 'application/javascript' if n.endswith('js') else 'text/css'))
   page.goto(url);page.wait_for_selector('.animal-card')
   assert '点击照片' not in page.locator('body').inner_text()
   page.locator('#search-input').fill('花豹');page.locator('.card-button').click()
   assert page.locator('#swipe-hint').count()==0
   if not reduced:assert page.locator('dialog').evaluate('(el)=>el.getAnimations().length')>0,'No opening transition'
   page.wait_for_selector('#detail-image:not([hidden])')
   page.locator('.detail-photo').evaluate('''el=>{el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,clientX:240,clientY:180,button:0}));el.dispatchEvent(new PointerEvent('pointermove',{pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,clientX:140,clientY:180,button:0}));}''')
   if not reduced:assert page.locator('#detail-image').evaluate('(el)=>getComputedStyle(el).transform')!='none','No drag feedback'
   page.locator('.detail-photo').evaluate("el=>el.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,clientX:140,clientY:180,button:0}))")
   assert page.locator('#image-count').inner_text()=='02 / 04'
   page.wait_for_selector('#detail-image:not([hidden])');page.wait_for_timeout(300)
   assert '左右滑动' not in page.locator('body').inner_text()
   if reduced:assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0,page.evaluate('document.getAnimations().map(a=>({target:a.effect.target.tagName,state:a.playState,timing:a.effect.getTiming()}))')
   page.locator('#close-dialog').click();page.wait_for_function('!document.querySelector("dialog").open')
   page.wait_for_function('document.body.style.position === ""')
   page.locator('.card-button').click();page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog").open')
   if not reduced:page.screenshot(path='/Users/sheeepsheepmac/.hermes/travel/animal-captions/motion-ui-review.png')
   print(engine.name,'reduced=',reduced,'PASS: no hints, modal motion, drag, swipe, close, Escape');b.close()
