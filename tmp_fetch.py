import urllib.request, re
url = "https://opengameart.org/content/cute-fish-sprites"
html = urllib.request.urlopen(url).read().decode('utf-8')
match = re.search(r"class=\"submitted\".*?username\">([^<]+)<", html, re.S)
print(match.group(1) if match else 'unknown')
