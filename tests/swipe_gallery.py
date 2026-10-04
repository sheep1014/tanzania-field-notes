import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
url='https://tanzania-field-notes.vercel.app/?v=swipe-1'
with sync_playwright() as p:
    for engine in [p.webkit,p.chromium]:
        b=engine.launch();page=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        if '--local' in sys.argv:
            for name in ['index.html','app.js','styles.css']:
                pattern='**/app.js*' if name=='app.js' else '**/styles.css*' if name=='styles.css' else '**/?v=swipe-1'
                page.route(pattern,lambda r,request,n=name:r.fulfill(body=Path(n).read_text(),content_type='text/html' if n.endswith('html') else 'application/javascript' if n.endswith('js') else 'text/css'))
        page.goto(url);page.wait_for_selector('.animal-card');page.locator('#search-input').fill('花豹');page.locator('.card-button').click();page.wait_for_selector('#detail-image:not([hidden])')
        def swipe(dx,dy=0,cancel=False):
            page.locator('.detail-photo').evaluate('''(el,args)=>{const [dx,dy,cancel]=args;for(const [type,x,y] of [['pointerdown',200,180],['pointermove',200+dx,180+dy],[cancel?'pointercancel':'pointerup',200+dx,180+dy]])el.dispatchEvent(new PointerEvent(type,{pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,clientX:x,clientY:y,button:0}));}''',[dx,dy,cancel])
        first=page.locator('#detail-image').get_attribute('src');swipe(-100)
        assert page.locator('#image-count').inner_text()=='02 / 04','Left swipe did not advance'
        assert page.locator('#detail-image').get_attribute('src')!=first
        swipe(100);assert page.locator('#image-count').inner_text()=='01 / 04'
        swipe(100);assert page.locator('#image-count').inner_text()=='01 / 04'
        swipe(-10);assert page.locator('#image-count').inner_text()=='01 / 04'
        swipe(-60,150);assert page.locator('#image-count').inner_text()=='01 / 04'
        swipe(-100,cancel=True);assert page.locator('#image-count').inner_text()=='01 / 04'
        for _ in range(5):swipe(-100)
        assert page.locator('#image-count').inner_text()=='04 / 04'
        assert page.locator('#previous-image').count()==0 and page.locator('#next-image').count()==0
        assert page.locator('.detail-photo').evaluate('(el)=>getComputedStyle(el).touchAction')=='pan-y pinch-zoom'
        # Exercise real browser-delivered gestures, not only DOM events.
        page.locator('#close-dialog').click();page.locator('.card-button').click()
        box=page.locator('.detail-photo').bounding_box();x=box['x']+box['width']*.75;y=box['y']+box['height']*.5
        if engine.name=='chromium':
            session=page.context.new_cdp_session(page)
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for delta in [20,50,90,120]:session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-delta,'y':y}]})
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else:
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-120,y,steps=8);page.mouse.up()
        assert page.locator('#image-count').inner_text()=='02 / 04'
        page.locator('#close-dialog').click();page.locator('#search-input').fill('缟獴');page.locator('.card-button').click();swipe(-100);assert page.locator('#image-count').inner_text()=='01 / 01'
        page.screenshot(path='/Users/sheeepsheepmac/.hermes/travel/animal-captions/swipe-review.png')
        print(engine.name,'PASS: horizontal, reverse, bounds, vertical, cancel, single-photo, no buttons');b.close()
