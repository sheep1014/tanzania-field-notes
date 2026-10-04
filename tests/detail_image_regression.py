import sys,json
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8767/'
with sync_playwright() as p:
 b=getattr(p,sys.argv[2] if len(sys.argv)>2 else 'webkit').launch(headless=True);page=b.new_page(viewport={'width':390,'height':844}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 held=[]; page.route('**/images/wildebeest-1.webp',lambda route:held.append(route))
 page.goto(url,wait_until='networkidle');page.locator('#animal-grid button').nth(0).click()
 page.wait_for_function("document.querySelector('#detail-image').complete && document.querySelector('#detail-image').naturalWidth>0")
 page.locator('#close-dialog').click();page.locator('#animal-grid button').nth(1).click()
 page.wait_for_timeout(100)
 snap=page.locator('#detail-image').evaluate('(i)=>({src:i.src,current:i.currentSrc,hidden:i.hidden,visibility:getComputedStyle(i).visibility,width:i.naturalWidth})')
 print(json.dumps(snap)); assert held,'Network request intercepted'
 stale='mongoose-1.webp' in snap['current'] and not snap['hidden'] and snap['visibility']!='hidden'
 assert not stale,'BUG: previous mongoose photo still visible while wildebeest is loading'
 assert snap['hidden'] or snap['visibility']=='hidden','BUG: reused detail image remains exposed while the replacement photo has not loaded'
 for route in held:route.continue_()
 page.wait_for_function("document.querySelector('#detail-image').complete && document.querySelector('#detail-image').naturalWidth>0 && document.querySelector('#detail-image').currentSrc.includes('wildebeest-1.webp')")
 page.locator('#detail-image').wait_for(state='visible')
 # A delayed request from a closed detail must not overwrite a newer animal.
 page.locator('#close-dialog').click()
 late=[];page.route('**/images/impala-1.webp',lambda route:late.append(route))
 page.locator('#animal-grid button').nth(2).click();page.wait_for_timeout(100)
 assert late
 page.locator('#close-dialog').click();page.locator('#animal-grid button').nth(0).click()
 page.locator('#detail-image').wait_for(state='visible')
 for route in late:route.continue_()
 page.wait_for_timeout(150)
 assert 'mongoose-1.webp' in page.locator('#detail-image').get_attribute('src')
 assert page.locator('#detail-name').inner_text()=='缟獴'
 page.locator('#close-dialog').click()
 page.route('**/images/baboon-1.webp',lambda route:route.abort())
 page.locator('#animal-grid button').nth(3).click()
 page.get_by_text('图片加载失败，请重新打开详情。',exact=True).wait_for()
 assert page.locator('#detail-image').is_hidden()
 assert not errors,errors
 print('PASS delayed-photo, rapid reopen, late response and failed-load regressions');b.close()
