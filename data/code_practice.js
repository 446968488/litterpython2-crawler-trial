// 学生园地 · 项目练习（爬虫主题）
// 两套项目练习，给学得快的孩子练手。每题用 Skulpt 在浏览器里真跑 Python 判分。
// 判分规则：运行输出里包含 expect 且无报错，即视为完成。
// 注意：内置 Python 引擎没有 json/math/random 模块、跑不了真实文件IO/网络/matplotlib；
//       题目全部用「纯内置函数 + re 正则」做爬虫相关的字符串解析与逻辑，按此约束设计。
//
// 两种练习（初级 / 中级）都是填空模式：
//   starter 里用 ____ 标出空缺，孩子补全后运行；完整答案放在 answer 字段，可点「看答案」对照。
//   expect 仍以输出命中为准判完成。
window.CODE_PRACTICE = {
  projects: [
    {
      id: 'p1', title: '从 URL 抠域名', fill: true,
      question: '从 URL 里抠出域名（// 和第一个 / 之间的部分），打印它。代码里 ____ 处要你来填。',
      hint: '先按 // 切，再按 / 切，取中间那段。',
      starter: "url = 'https://www.baidu.com/s?wd=python'\ndomain = url.split(____)[1].split('/')[0]\nprint(domain)",
      answer: "url = 'https://www.baidu.com/s?wd=python'\ndomain = url.split('//')[1].split('/')[0]\nprint(domain)",
      expect: 'www.baidu.com'
    },
    {
      id: 'p2', title: '提取搜索词', fill: true,
      question: 'URL 里 q= 后面到 & 或结尾是搜索词，抠出来打印。代码里 ____ 处要你来填。',
      hint: '先按 q= 切，再按 & 切。',
      starter: "url = 'https://x.com/search?q=猫咪&page=2'\nq = url.split('q=')[1].split(____)[0]\nprint(q)",
      answer: "url = 'https://x.com/search?q=猫咪&page=2'\nq = url.split('q=')[1].split('&')[0]\nprint(q)",
      expect: '猫咪'
    },
    {
      id: 'p3', title: '状态码分类', fill: true,
      question: '给定状态码 404，200 打印「成功」、404 打印「找不到」、其它打印「服务器错」。代码里 ____ 处要你来填。',
      hint: 'elif 判断的应该是 404。',
      starter: "code = 404\nif code == 200:\n    print('成功')\nelif code == ____:\n    print('找不到')\nelse:\n    print('服务器错')",
      answer: "code = 404\nif code == 200:\n    print('成功')\nelif code == 404:\n    print('找不到')\nelse:\n    print('服务器错')",
      expect: '找不到'
    },
    {
      id: 'p4', title: '关键词计数', fill: true,
      question: '统计页面文本里「python」出现了几次，打印「python 出现 X 次」。代码里 ____ 处要你来填。',
      hint: "字符串的 .count('词') 直接数。",
      starter: "page = 'python 爬虫 python 学习 python'\nn = page.count(____)\nprint('python 出现 ' + str(n) + ' 次')",
      answer: "page = 'python 爬虫 python 学习 python'\nn = page.count('python')\nprint('python 出现 ' + str(n) + ' 次')",
      expect: 'python 出现 3 次'
    },
    {
      id: 'p5', title: '拼分页链接', fill: true,
      question: '基础 URL 后拼上第 1、2、3 页，每行打印一个完整链接。代码里 ____ 处要你来填。',
      hint: 'range(1, 4) 能生成 1,2,3。',
      starter: "base = 'https://x.com/list?page='\nfor i in range(1, ____):\n    print(base + str(i))",
      answer: "base = 'https://x.com/list?page='\nfor i in range(1, 4):\n    print(base + str(i))",
      expect: 'https://x.com/list?page=3'
    },
    {
      id: 'p6', title: 'HTML 实体解码', fill: true,
      question: '把 HTML 实体 &amp; 还原成 &，打印解码后的文本。代码里 ____ 处要你来填。',
      hint: "用 .replace('&amp;', '&')。",
      starter: "text = 'Tom &amp; Jerry'\nprint(text.replace('&amp;', ____))",
      answer: "text = 'Tom &amp; Jerry'\nprint(text.replace('&amp;', '&'))",
      expect: 'Tom & Jerry'
    },
    {
      id: 'p7', title: '提取所有链接', fill: true,
      question: '用正则从 HTML 片段里抠出所有 href 的链接，每行打印一个。代码里 ____ 处要你来填。',
      hint: "re.findall(r'href=\"(.*?)\"', html) 能抠出引号里的链接。",
      starter: "import re\nhtml = '<a href=\"https://a.com\">A</a><a href=\"https://b.com\">B</a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\nfor ____ in links:\n    print(l)",
      answer: "import re\nhtml = '<a href=\"https://a.com\">A</a><a href=\"https://b.com\">B</a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\nfor l in links:\n    print(l)",
      expect: 'https://b.com'
    },
    {
      id: 'p8', title: '链接去重', fill: true,
      question: '爬到的链接有重复，用 set 去重后打印「去重后 X 个」。代码里 ____ 处要你来填。',
      hint: 'set(列表) 自动去重。',
      starter: "urls = ['https://a.com', 'https://a.com', 'https://b.com']\nunique = ____(urls)\nprint('去重后 ' + str(len(unique)) + ' 个')",
      answer: "urls = ['https://a.com', 'https://a.com', 'https://b.com']\nunique = set(urls)\nprint('去重后 ' + str(len(unique)) + ' 个')",
      expect: '去重后 2 个'
    },
    {
      id: 'p9', title: '站内链接判断', fill: true,
      question: '给定域名和链接，判断链接是否以该域名开头（站内），打印「站内」或「外链」。代码里 ____ 处要你来填。',
      hint: "startswith('https://' + domain) 判断是否本站。",
      starter: "domain = 'x.com'\nlink = 'https://x.com/about'\nif link.startswith('https://' + ____):\n    print('站内')\nelse:\n    print('外链')",
      answer: "domain = 'x.com'\nlink = 'https://x.com/about'\nif link.startswith('https://' + domain):\n    print('站内')\nelse:\n    print('外链')",
      expect: '站内'
    },
    {
      id: 'p10', title: '相对路径转绝对', fill: true,
      question: '把相对路径拼到 base 后面变成绝对 URL，打印结果。代码里 ____ 处要你来填。',
      hint: '字符串相加即可。',
      starter: "base = 'https://x.com/blog/'\nrel = 'post1.html'\nprint(base + ____)",
      answer: "base = 'https://x.com/blog/'\nrel = 'post1.html'\nprint(base + rel)",
      expect: 'https://x.com/blog/post1.html'
    },
    {
      id: 'p11', title: '提取页面标题', fill: true,
      question: '用正则从 HTML 里抠出 <title> 的文字并打印。代码里 ____ 处要你来填。',
      hint: "re.search(r'<title>(.*?)</title>', html).group(1)。",
      starter: "import re\nhtml = '<title>我的爬虫笔记</title>'\nm = re.search(r'<title>(.*?)</title>', html)\nprint(____.group(1))",
      answer: "import re\nhtml = '<title>我的爬虫笔记</title>'\nm = re.search(r'<title>(.*?)</title>', html)\nprint(m.group(1))",
      expect: '我的爬虫笔记'
    },
    {
      id: 'p12', title: '限速间隔', fill: true,
      question: '每秒最多爬 1 次，给定当前秒数和间隔，算下次最早可爬的时间。代码里 ____ 处要你来填。',
      hint: '下次 = 当前 + 间隔。',
      starter: "now = 10\ninterval = 1\nnext_time = ____ + ____\nprint('下次可爬：第 ' + str(next_time) + ' 秒')",
      answer: "now = 10\ninterval = 1\nnext_time = now + interval\nprint('下次可爬：第 ' + str(next_time) + ' 秒')",
      expect: '下次可爬：第 11 秒'
    },
    {
      id: 'p13', title: '去掉 HTML 标签', fill: true,
      question: '用正则去掉尖括号标签，把 <p>你好</p> 变成纯文本打印。代码里 ____ 处要你来填。',
      hint: "re.sub(r'<.*?>', '', html) 把标签换成空。",
      starter: "import re\nhtml = '<p>你好</p>'\ntext = re.sub(r'<.*?>', ____, html)\nprint(text)",
      answer: "import re\nhtml = '<p>你好</p>'\ntext = re.sub(r'<.*?>', '', html)\nprint(text)",
      expect: '你好'
    },
    {
      id: 'p14', title: '关键词是否存在', fill: true,
      question: '判断页面文本里有没有「价格」二字，打印「有」或「没有」。代码里 ____ 处要你来填。',
      hint: "用 in 判断子串。",
      starter: "page = '商品名称 价格 99 元'\nif '价格' ____ page:\n    print('有')\nelse:\n    print('没有')",
      answer: "page = '商品名称 价格 99 元'\nif '价格' in page:\n    print('有')\nelse:\n    print('没有')",
      expect: '有'
    },
    {
      id: 'p15', title: '拼 GET 查询串', fill: true,
      question: '把搜索词和页码拼进查询串，组成完整 GET 链接打印。代码里 ____ 处要你来填。',
      hint: "url = base + 'q=' + q + '&page=' + page。",
      starter: "base = 'https://x.com/s?'\nq = 'python'\npage = '3'\nurl = ____\nprint(url)",
      answer: "base = 'https://x.com/s?'\nq = 'python'\npage = '3'\nurl = base + 'q=' + q + '&page=' + page\nprint(url)",
      expect: 'https://x.com/s?q=python&page=3'
    },
    {
      id: 'p16', title: '提取图片地址', fill: true,
      question: '用正则从 HTML 抠出所有 img 的 src，每行打印一个。代码里 ____ 处要你来填。',
      hint: "re.findall(r'src=\"(.*?)\"', html)。",
      starter: "import re\nhtml = '<img src=\"a.jpg\"><img src=\"b.png\">'\nfor s in re.findall(r'src=\"(.*?)\"', html):\n    print(____)",
      answer: "import re\nhtml = '<img src=\"a.jpg\"><img src=\"b.png\">'\nfor s in re.findall(r'src=\"(.*?)\"', html):\n    print(s)",
      expect: 'b.png'
    },
    {
      id: 'p17', title: '抓取条数统计', fill: true,
      question: '统计抓到的数据列表长度，打印「共抓到 X 条」。代码里 ____ 处要你来填。',
      hint: "len(列表) 取长度。",
      starter: "data = ['标题1', '标题2', '标题3', '标题4']\nprint('共抓到 ' + str(____(data)) + ' 条')",
      answer: "data = ['标题1', '标题2', '标题3', '标题4']\nprint('共抓到 ' + str(len(data)) + ' 条')",
      expect: '共抓到 4 条'
    },
    {
      id: 'p18', title: '忽略大小写匹配', fill: true,
      question: '把页面文本转小写再判断是否含 python，打印「匹配」或「不匹配」。代码里 ____ 处要你来填。',
      hint: "page.lower() 转小写。",
      starter: "page = 'Python 很有趣'\nif 'python' in page.____():\n    print('匹配')\nelse:\n    print('不匹配')",
      answer: "page = 'Python 很有趣'\nif 'python' in page.lower():\n    print('匹配')\nelse:\n    print('不匹配')",
      expect: '匹配'
    },
    {
      id: 'p19', title: 'robots 简单判断', fill: true,
      question: 'robots 禁止 /admin 开头的路径，给定路径判断能否爬，打印「不能爬」或「能爬」。代码里 ____ 处要你来填。',
      hint: "path.startswith('/admin')。",
      starter: "path = '/admin/login'\nif path.____('/admin'):\n    print('不能爬')\nelse:\n    print('能爬')",
      answer: "path = '/admin/login'\nif path.startswith('/admin'):\n    print('不能爬')\nelse:\n    print('能爬')",
      expect: '不能爬'
    },
    {
      id: 'p20', title: '写成 CSV 一行', fill: true,
      question: '把标题和价格用逗号拼成 CSV 一行打印。代码里 ____ 处要你来填。',
      hint: "字符串相加：title + ',' + price。",
      starter: "title = '手机'\nprice = '1999'\nprint(title + ____ + price)",
      answer: "title = '手机'\nprice = '1999'\nprint(title + ',' + price)",
      expect: '手机,1999'
    }
  ],
  advanced: [
    {
      id: 'a1', title: '批量生成分页 URL', fill: true,
      question: '生成某列表前 5 页的 URL（base + ?page= + 页码），打印「共 X 个」。代码里 ____ 处要你来填。',
      hint: 'range(1, 6) 生成 1 到 5。',
      starter: "base = 'https://x.com/p?page='\nurls = [base + str(i) for i in range(1, ____)]\nprint('共 ' + str(len(urls)) + ' 个')",
      answer: "base = 'https://x.com/p?page='\nurls = [base + str(i) for i in range(1, 6)]\nprint('共 ' + str(len(urls)) + ' 个')",
      expect: '共 5 个'
    },
    {
      id: 'a2', title: '区分站内/外链', fill: true,
      question: '从 HTML 抠出所有链接，统计以指定域名开头的「站内」链接个数并打印。代码里 ____ 处要你来填。',
      hint: "l.startswith(domain) 判断是不是本站链接。",
      starter: "import re\nhtml = '<a href=\"https://x.com/a\">1</a><a href=\"https://y.com/b\">2</a><a href=\"https://x.com/c\">3</a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\ndomain = 'https://x.com'\ncount = 0\nfor l in links:\n    if l.____(domain):\n        count += 1\nprint('站内 ' + str(count) + ' 个')",
      answer: "import re\nhtml = '<a href=\"https://x.com/a\">1</a><a href=\"https://y.com/b\">2</a><a href=\"https://x.com/c\">3</a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\ndomain = 'https://x.com'\ncount = 0\nfor l in links:\n    if l.startswith(domain):\n        count += 1\nprint('站内 ' + str(count) + ' 个')",
      expect: '站内 2 个'
    },
    {
      id: 'a3', title: 'robots 多规则匹配', fill: true,
      question: 'robots 禁止 /private 和 /tmp，给定路径判断并打印「禁止」或「允许」。代码里 ____ 处要你来填。',
      hint: '命中任一条禁止规则就把 ok 设成 False。',
      starter: "blocked = ['/private', '/tmp']\npath = '/private/secret'\nok = True\nfor b in blocked:\n    if path.startswith(b):\n        ok = ____\n        break\nprint('禁止' if not ok else '允许')",
      answer: "blocked = ['/private', '/tmp']\npath = '/private/secret'\nok = True\nfor b in blocked:\n    if path.startswith(b):\n        ok = False\n        break\nprint('禁止' if not ok else '允许')",
      expect: '禁止'
    },
    {
      id: 'a4', title: '标题去重排序', fill: true,
      question: '从 HTML 抠出所有 <h2> 标题，去重后按默认顺序打印（每行一个）。代码里 ____ 处要你来填。',
      hint: 'set 去重后，用 .sort() 排序。',
      starter: "import re\nhtml = '<h2>香蕉</h2><h2>苹果</h2><h2>香蕉</h2>'\ntitles = list(set(re.findall(r'<h2>(.*?)</h2>', html)))\ntitles.____()\nfor t in titles:\n    print(t)",
      answer: "import re\nhtml = '<h2>香蕉</h2><h2>苹果</h2><h2>香蕉</h2>'\ntitles = list(set(re.findall(r'<h2>(.*?)</h2>', html)))\ntitles.sort()\nfor t in titles:\n    print(t)",
      expect: '苹果'
    },
    {
      id: 'a5', title: '搜索 URL 列表', fill: true,
      question: '给定关键词和页数，生成搜索 URL 列表，打印第 3 个。代码里 ____ 处要你来填。',
      hint: '列表下标从 0 开始，第 3 个是 urls[2]。',
      starter: "base = 'https://x.com/s'\nq = '手机'\nurls = []\nfor i in range(1, 4):\n    urls.append(base + '?q=' + q + '&page=' + str(i))\nprint(____[2])",
      answer: "base = 'https://x.com/s'\nq = '手机'\nurls = []\nfor i in range(1, 4):\n    urls.append(base + '?q=' + q + '&page=' + str(i))\nprint(urls[2])",
      expect: 'https://x.com/s?q=手机&page=3'
    },
    {
      id: 'a6', title: '重试退避时间', fill: true,
      question: '第 n 次重试等待 2^(n-1) 秒，计算第 3 次重试要等几秒。代码里 ____ 处要你来填。',
      hint: '指数退避：2 ** (n - 1)。',
      starter: "n = 3\nwait = 2 ** (____ - 1)\nprint('等待 ' + str(wait) + ' 秒')",
      answer: "n = 3\nwait = 2 ** (n - 1)\nprint('等待 ' + str(wait) + ' 秒')",
      expect: '等待 4 秒'
    },
    {
      id: 'a7', title: '去除 HTML 注释', fill: true,
      question: '用正则去掉 <!-- --> 注释，打印剩余内容。代码里 ____ 处要你来填。',
      hint: "re.sub(r'<!--.*?-->', '', html)。",
      starter: "import re\nhtml = '标题<!-- 这是注释 -->正文'\nclean = re.sub(r'<!--.*?-->', ____, html)\nprint(clean)",
      answer: "import re\nhtml = '标题<!-- 这是注释 -->正文'\nclean = re.sub(r'<!--.*?-->', '', html)\nprint(clean)",
      expect: '标题正文'
    },
    {
      id: 'a8', title: '统计域名出现', fill: true,
      question: '从链接里统计含 x.com 的链接数量，打印「x.com 出现 X 次」。代码里 ____ 处要你来填。',
      hint: "命中就 cnt += 1。",
      starter: "import re\nhtml = '<a href=\"https://x.com/1\"></a><a href=\"https://y.com/2\"></a><a href=\"https://x.com/3\"></a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\ncnt = 0\nfor l in links:\n    if 'x.com' in l:\n        cnt ____ 1\nprint('x.com 出现 ' + str(cnt) + ' 次')",
      answer: "import re\nhtml = '<a href=\"https://x.com/1\"></a><a href=\"https://y.com/2\"></a><a href=\"https://x.com/3\"></a>'\nlinks = re.findall(r'href=\"(.*?)\"', html)\ncnt = 0\nfor l in links:\n    if 'x.com' in l:\n        cnt += 1\nprint('x.com 出现 ' + str(cnt) + ' 次')",
      expect: 'x.com 出现 2 次'
    },
    {
      id: 'a9', title: '批量相对转绝对', fill: true,
      question: '把多个相对路径拼到 base 后生成绝对链接，打印「生成 X 个」。代码里 ____ 处要你来填。',
      hint: 'base + r 拼每个相对路径。',
      starter: "base = 'https://x.com/gallery/'\nrels = ['a.jpg', 'b.jpg', 'c.jpg']\nabs_urls = []\nfor r in rels:\n    abs_urls.append(base + ____)\nprint('生成 ' + str(len(abs_urls)) + ' 个')",
      answer: "base = 'https://x.com/gallery/'\nrels = ['a.jpg', 'b.jpg', 'c.jpg']\nabs_urls = []\nfor r in rels:\n    abs_urls.append(base + r)\nprint('生成 ' + str(len(abs_urls)) + ' 个')",
      expect: '生成 3 个'
    },
    {
      id: 'a10', title: '过滤伪链接', fill: true,
      question: '只保留 http/https 开头的合法链接，统计个数打印。代码里 ____ 处要你来填。',
      hint: "c.startswith('http') 过滤掉 ftp/mailto 等。",
      starter: "cands = ['https://a.com', 'ftp://b.com', 'http://c.com', 'mailto:d@x.com']\ngood = 0\nfor c in cands:\n    if c.____('http'):\n        good += 1\nprint('合法 ' + str(good) + ' 个')",
      answer: "cands = ['https://a.com', 'ftp://b.com', 'http://c.com', 'mailto:d@x.com']\ngood = 0\nfor c in cands:\n    if c.startswith('http'):\n        good += 1\nprint('合法 ' + str(good) + ' 个')",
      expect: '合法 2 个'
    },
    {
      id: 'a11', title: '结果字典取字段', fill: true,
      question: '用字典存一条爬取结果 {标题, 价格}，打印价格。代码里 ____ 处要你来填。',
      hint: "item['价格'] 取值。",
      starter: "item = {'标题': '键盘', '价格': '299'}\nprint('价格 ' + item[____])",
      answer: "item = {'标题': '键盘', '价格': '299'}\nprint('价格 ' + item['价格'])",
      expect: '价格 299'
    },
    {
      id: 'a12', title: '提取邮箱地址', fill: true,
      question: '用正则从文本抠出所有邮箱地址，每行打印一个。代码里 ____ 处要你来填。',
      hint: "re.findall(r'[\\w.]+@[\\w.]+\\.\\w+', text) 抠邮箱。",
      starter: "import re\ntext = '联系我：hi@x.com 或 ok@y.com'\nfor e in re.findall(r'[\\w.]+@[\\w.]+\\.\\w+', text):\n    print(____)",
      answer: "import re\ntext = '联系我：hi@x.com 或 ok@y.com'\nfor e in re.findall(r'[\\w.]+@[\\w.]+\\.\\w+', text):\n    print(e)",
      expect: 'ok@y.com'
    },
    {
      id: 'a13', title: '清洗流水线', fill: true,
      question: '多个含标签和空白的文本，清洗（去标签→去空白→去重）后，打印「清洗后 X 条」。代码里 ____ 处要你来填。',
      hint: '去重时判断 t 是否已在 clean 里。',
      starter: "import re\nraw = ['<p>苹果</p> ', ' <p>香蕉</p>', '<p>苹果</p> ']\nclean = []\nfor r in raw:\n    t = re.sub(r'<.*?>', '', r).strip()\n    if t not in ____:\n        clean.append(t)\nprint('清洗后 ' + str(len(clean)) + ' 条')",
      answer: "import re\nraw = ['<p>苹果</p> ', ' <p>香蕉</p>', '<p>苹果</p> ']\nclean = []\nfor r in raw:\n    t = re.sub(r'<.*?>', '', r).strip()\n    if t not in clean:\n        clean.append(t)\nprint('清洗后 ' + str(len(clean)) + ' 条')",
      expect: '清洗后 2 条'
    },
    {
      id: 'a14', title: '判断是否末页', fill: true,
      question: '当前页 cur，总页 total，若已到最后一页打印「到末页」，否则「还有下一页」。代码里 ____ 处要你来填。',
      hint: 'cur >= total 说明到末页。',
      starter: "cur = 5\ntotal = 5\nif cur >= ____:\n    print('到末页')\nelse:\n    print('还有下一页')",
      answer: "cur = 5\ntotal = 5\nif cur >= total:\n    print('到末页')\nelse:\n    print('还有下一页')",
      expect: '到末页'
    },
    {
      id: 'a15', title: '提取表格单元格', fill: true,
      question: '用正则从一行 <tr> 抠出所有 <td> 单元格文字，用空格连起来打印。代码里 ____ 处要你来填。',
      hint: "' '.join(cells) 把列表拼成一行。",
      starter: "import re\nrow = '<tr><td>甲</td><td>乙</td></tr>'\ncells = re.findall(r'<td>(.*?)</td>', row)\nprint(' '.join(____))",
      answer: "import re\nrow = '<tr><td>甲</td><td>乙</td></tr>'\ncells = re.findall(r'<td>(.*?)</td>', row)\nprint(' '.join(cells))",
      expect: '甲 乙'
    },
    {
      id: 'a16', title: '限速器计算', fill: true,
      question: '每分钟 60 秒，间隔 interval 秒爬一条，算每分钟最多能爬几条（整除）。代码里 ____ 处要你来填。',
      hint: '60 // interval 整数除法。',
      starter: "interval = 2\nmax_per_min = 60 // ____\nprint('每分钟最多 ' + str(max_per_min) + ' 条')",
      answer: "interval = 2\nmax_per_min = 60 // interval\nprint('每分钟最多 ' + str(max_per_min) + ' 条')",
      expect: '每分钟最多 30 条'
    },
    {
      id: 'a17', title: '合并去重', fill: true,
      question: '两个来源各爬到一些链接，合并后去重，打印「合并去重 X 条」。代码里 ____ 处要你来填。',
      hint: 'set(a + b) 合并再去重。',
      starter: "a = ['https://x.com/1', 'https://x.com/2']\nb = ['https://x.com/2', 'https://x.com/3']\nmerged = list(set(____ + ____))\nprint('合并去重 ' + str(len(merged)) + ' 条')",
      answer: "a = ['https://x.com/1', 'https://x.com/2']\nb = ['https://x.com/2', 'https://x.com/3']\nmerged = list(set(a + b))\nprint('合并去重 ' + str(len(merged)) + ' 条')",
      expect: '合并去重 3 条'
    },
    {
      id: 'a18', title: '提取 meta 描述', fill: true,
      question: '用正则从 <meta> 标签抠出 content 的值并打印。代码里 ____ 处要你来填。',
      hint: "re.search(r'content=\"(.*?)\"', html).group(1)。",
      starter: "import re\nhtml = '<meta name=\"description\" content=\"爬虫教程\">'\nm = re.search(r'content=\"(.*?)\"', html)\nprint(____.group(1))",
      answer: "import re\nhtml = '<meta name=\"description\" content=\"爬虫教程\">'\nm = re.search(r'content=\"(.*?)\"', html)\nprint(m.group(1))",
      expect: '爬虫教程'
    },
    {
      id: 'a19', title: '可重试状态码', fill: true,
      question: '状态码 500/502/503 视为可重试，其它不可重试，给定 503 打印「可重试」或「不可重试」。代码里 ____ 处要你来填。',
      hint: '可重试列表里补上 503。',
      starter: "code = 503\nif code in [500, 502, ____]:\n    print('可重试')\nelse:\n    print('不可重试')",
      answer: "code = 503\nif code in [500, 502, 503]:\n    print('可重试')\nelse:\n    print('不可重试')",
      expect: '可重试'
    },
    {
      id: 'a20', title: '小型爬虫流水线', fill: true,
      question: '给定几篇页面标题（直接给列表），去重后排序，打印总数和最后一篇。代码里 ____ 处要你来填。',
      hint: 'uniq[-1] 取排序后的最后一篇。',
      starter: "titles = ['爬虫入门', '反爬实战', '爬虫入门', '数据存储']\nuniq = sorted(set(titles))\nprint('共 ' + str(len(uniq)) + ' 篇，最后一篇：' + ____[-1])",
      answer: "titles = ['爬虫入门', '反爬实战', '爬虫入门', '数据存储']\nuniq = sorted(set(titles))\nprint('共 ' + str(len(uniq)) + ' 篇，最后一篇：' + uniq[-1])",
      expect: '共 3 篇，最后一篇：爬虫入门'
    },
    {"id": "ac1", "title": "写函数·提取邮箱", "fill": false, "question": "写一个函数 extract_emails(text)，用正则返回文本里所有邮箱组成的列表，并打印结果。函数体由你写（starter 里用 pass 占位）。", "hint": "re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]+', text) 直接拿到所有邮箱。", "starter": "import re\n\ndef extract_emails(text):\n    # 在这里写你的函数体\n    pass\n\ntext = '联系 a@x.com 或 b@y.com 谢谢'\nprint(extract_emails(text))", "answer": "import re\n\ndef extract_emails(text):\n    return re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]+', text)\n\ntext = '联系 a@x.com 或 b@y.com 谢谢'\nprint(extract_emails(text))", "expect": "['a@x.com', 'b@y.com']"},
    {"id": "ac2", "title": "写函数·robots 判断", "fill": false, "question": "写一个函数 is_allowed(url, banned)：url 路径以任一 banned 前缀开头则不允许（返回 False），否则返回 True。并打印两个测试用例。", "hint": "先把 url 按 'https://x.com' 切出路径，再用 startswith 逐个 banned 判断。", "starter": "def is_allowed(url, banned):\n    # 在这里写你的逻辑\n    pass\n\nprint(is_allowed('https://x.com/secret/a', ['/secret', '/admin']))\nprint(is_allowed('https://x.com/public', ['/secret', '/admin']))", "answer": "def is_allowed(url, banned):\n    path = url.split('https://x.com')[1]\n    for b in banned:\n        if path.startswith(b):\n            return False\n    return True\n\nprint(is_allowed('https://x.com/secret/a', ['/secret', '/admin']))\nprint(is_allowed('https://x.com/public', ['/secret', '/admin']))", "expect": "False"},
    {"id": "ac3", "title": "写函数·去 HTML 标签", "fill": false, "question": "写一个函数 clean_text(html)，用正则把 HTML 标签（<...>）去掉，返回纯文本并打印。", "hint": "re.sub(r'<.*?>', '', html) 即可。", "starter": "import re\n\ndef clean_text(html):\n    # 在这里写你的函数体\n    pass\n\nprint(clean_text('<p>你好</p><div>世界</div>'))", "answer": "import re\n\ndef clean_text(html):\n    return re.sub(r'<.*?>', '', html)\n\nprint(clean_text('<p>你好</p><div>世界</div>'))", "expect": "你好世界"},
    {"id": "ac4", "title": "写函数·域名 TOP", "fill": false, "question": "写一个函数 top_domains(urls, n)：统计各域名出现次数，返回按次数降序（同次域名升序）的前 n 个 (域名, 次数) 列表并打印。", "hint": "用字典累加频次，再 sorted(items, key=lambda x:(-x[1], x[0])) 排序取前 n。", "starter": "def top_domains(urls, n):\n    # 在这里写你的逻辑\n    pass\n\nurls = ['https://a.com/1', 'https://b.com/2', 'https://a.com/3', 'https://a.com/4']\nprint(top_domains(urls, 2))", "answer": "def top_domains(urls, n):\n    c = {}\n    for u in urls:\n        d = u.split('//')[1].split('/')[0]\n        c[d] = c.get(d, 0) + 1\n    items = sorted(c.items(), key=lambda x: (-x[1], x[0]))\n    return items[:n]\n\nurls = ['https://a.com/1', 'https://b.com/2', 'https://a.com/3', 'https://a.com/4']\nprint(top_domains(urls, 2))", "expect": "[('a.com', 3), ('b.com', 1)]"},
    {"id": "ac5", "title": "写函数·分页链接", "fill": false, "question": "写一个函数 paginate(base, total, size)：每页 size 条，返回从第 1 页到最后一页的分页链接列表并打印（提示：总页数 = (total+size-1)//size）。", "hint": "range(1, pages+1) 拼 base + str(i)。", "starter": "def paginate(base, total, size):\n    # 在这里写你的逻辑\n    pass\n\nprint(paginate('https://x.com/list?p=', 25, 10))", "answer": "def paginate(base, total, size):\n    pages = (total + size - 1) // size\n    return [base + str(i) for i in range(1, pages + 1)]\n\nprint(paginate('https://x.com/list?p=', 25, 10))", "expect": "https://x.com/list?p=3"}
  ],
  hard: [
    {"id": "h1", "title": "迷你抓取·外链提取", "fill": false, "question": "写一个函数 get_external(html)：从 HTML 提取所有 href，过滤出以 http 开头的外链，去重后返回；并打印「外链 X 条：」和每个链接。", "hint": "用 re.findall 提取所有 href，过滤 http 开头的外链，再用 list(set()) 去重。", "starter": "import re\nhtml = '<a href=\"https://a.com\">A</a><a href=\"/page\">B</a><a href=\"https://b.com\">C</a><a href=\"https://a.com\">A2</a>'\n\ndef get_external(html):\n    # 在这里写你的函数体\n    pass\n\nres = get_external(html)\nprint('外链 ' + str(len(res)) + ' 条：')\nfor r in res:\n    print(r)", "answer": "import re\nhtml = '<a href=\"https://a.com\">A</a><a href=\"/page\">B</a><a href=\"https://b.com\">C</a><a href=\"https://a.com\">A2</a>'\n\ndef get_external(html):\n    links = re.findall(r'href=\"(.*?)\"', html)\n    ext = [l for l in links if l.startswith('http')]\n    return list(set(ext))\n\nres = get_external(html)\nprint('外链 ' + str(len(res)) + ' 条：')\nfor r in res:\n    print(r)", "expect": "外链 2 条："},
    {"id": "h2", "title": "实战·标题报告", "fill": false, "question": "写一个函数 report(html)：提取所有 <title> 内容，去重，按长度升序排序，打印「共 X 个标题：」和每个标题。", "hint": "re.findall(r'<title>(.*?)</title>', html) 取标题；sorted(set(...), key=lambda s: len(s)) 排序。", "starter": "import re\nhtml = '<title>Python</title><title>爬虫</title><title>Python</title><title>入门</title>'\n\ndef report(html):\n    # 在这里写你的函数体\n    pass\n\nreport(html)", "answer": "import re\nhtml = '<title>Python</title><title>爬虫</title><title>Python</title><title>入门</title>'\n\ndef report(html):\n    titles = re.findall(r'<title>(.*?)</title>', html)\n    uniq = sorted(set(titles), key=lambda s: len(s))\n    print('共 ' + str(len(uniq)) + ' 个标题：')\n    for t in uniq:\n        print(t)\n\nreport(html)", "expect": "共 3 个标题："},
    {"id": "h3", "title": "实战·模拟小爬虫", "fill": false, "question": "写一个函数 crawl(sitemap)：输入多行站点地图（每行一个 URL），逐行取出 URL、提取域名、统计各域名次数，按次数降序（同次域名升序）打印「域名: 次数」，最后打印「共抓取 X 页」。", "hint": "按 '\\n' 切行；每行 strip 跳过空行；split('//')[1].split('/')[0] 取域名；字典累加；sorted(key=lambda x:(-x[1],x[0])) 排序。", "starter": "sitemap = '''https://news.com/a\nhttps://news.com/b\nhttps://blog.com/a\nhttps://news.com/c'''\n\ndef crawl(sitemap):\n    # 在这里写你的爬虫\n    pass\n\ncrawl(sitemap)", "answer": "sitemap = '''https://news.com/a\nhttps://news.com/b\nhttps://blog.com/a\nhttps://news.com/c'''\n\ndef crawl(sitemap):\n    c = {}\n    for line in sitemap.split('\\n'):\n        line = line.strip()\n        if not line:\n            continue\n        d = line.split('//')[1].split('/')[0]\n        c[d] = c.get(d, 0) + 1\n    items = sorted(c.items(), key=lambda x: (-x[1], x[0]))\n    for k, v in items:\n        print(k + ': ' + str(v))\n    print('共抓取 ' + str(sum(c.values())) + ' 页')\n\ncrawl(sitemap)", "expect": "共抓取 4 页"}
  ]
};
