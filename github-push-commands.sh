#!/bin/bash
# شغّل هذا الملف داخل مجلد المشروع بعد فك الضغط
# استبدل <اسم_حسابك> باسم حسابك على GitHub

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Mv2lx/Elfares-Salle
git push -u origin main
