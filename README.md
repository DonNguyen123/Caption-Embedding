<a href="https://www.buymeacoffee.com/randompers0" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
# Caption-Embedding
This code essentially allows you to embed vtt caption files into a mp4 file, meaning you get toggleable captions. To start using this code, please download the files provided in this directory, which if done correctly will give something like this:

![alt text](https://github.com/DonNguyen123/Caption-Embedding/blob/e4738da22a8fb56280a7c2f9ac0cd495fc7197fd/Instruction%20Images/File_Placement.png)

Now, to actually run the code that you just downloaded, you need to activate a 8000 server, and not by direcly clicking the html. The reasoning for this is the libary used for such a code requires a server to load in. Note that in technically there are a lot of ways to run a server, which I am sure you will be able to search online for. I have tested this code, for example, on a basic local python server, which can be done with the following steps:

1. Open your terminal
2. Go to the folder in which this code is 
3. Run this line in your local terminal: python -m http.server
4. Literally just go to http://localhost:8000 on any browser

Doing the steps above will give you something like this:

![alt text](https://github.com/DonNguyen123/Caption-Embedding/blob/e4738da22a8fb56280a7c2f9ac0cd495fc7197fd/Instruction%20Images/Default_Look.png)

From here, you simply have to fill in the data needed, that is to say, to input the files for the video and the vtt caption file. After you have done this, simply click the green "Embed Captions in Video" button, and wait for it work. Once it is done, a preview of the captioned file will appear, and look something like this:

![alt text](https://github.com/DonNguyen123/Caption-Embedding/blob/e4738da22a8fb56280a7c2f9ac0cd495fc7197fd/Instruction%20Images/Input.png)

From here, you either click the blue "Download" button to get the file in your drive, or the grey "Process Another" to repeat for another file.

![alt text](https://github.com/DonNguyen123/Caption-Embedding/blob/e4738da22a8fb56280a7c2f9ac0cd495fc7197fd/Instruction%20Images/Result.png)

