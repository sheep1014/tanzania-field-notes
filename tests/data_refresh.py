import sys,json
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.webkit.launch();page=b.new_page()
    if '--local' in sys.argv:
        page.route('**/app.js*',lambda r:r.fulfill(content_type='application/javascript',body=Path('app.js').read_text()))
    page.add_init_script("window.fetchCalls=[];const originalFetch=window.fetch;window.fetch=(url,options)=>{window.fetchCalls.push({url:String(url),options});return originalFetch(url,options)}")
    page.goto('https://sheep1014.github.io/tanzania-field-notes/?v=data-refresh-1')
    page.wait_for_selector('.animal-card')
    calls=page.evaluate('fetchCalls');call=next(c for c in calls if 'animals.json' in c['url'])
    assert parse_qs(urlparse(call['url']).query).get('v')==['data-refresh-1'],call
    assert call.get('options',{}).get('cache')=='no-store',call
    page.locator('#search-input').fill('犬羚')
    assert page.locator('.animal-card h3').all_text_contents()==['犬羚']
    print(json.dumps({'data_request':call,'search':'犬羚 visible'},ensure_ascii=False));b.close()
