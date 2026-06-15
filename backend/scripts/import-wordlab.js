/**
 * WordLab 词库导入脚本
 * 将 WordLab 的 125 个高中核心词汇（含互动模拟关联）导入 dedanci.com 数据库
 *
 * 用法: node scripts/import-wordlab.js
 */

import initSqlJs from 'sql.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../data/dedanci.db')

// WordLab 125词种子数据（按高考场景分类，12个互动模拟关联）
const WORDLAB_DATA = [
  // 🏠 日常生活 daily
  { word: "family", phonetic: "/ˈfæməli/", meaning: "n. 家庭；家人", english_meaning: "a group of people who are related to each other", example: "My family moved to Beijing when I was ten.", example_translation: "我十岁时全家搬到了北京。", pos: "noun", difficulty: 1, category: "daily", phet_sim_id: "natural-selection", phet_context: "特征在家族中代代相传？看看 →", frequency: 180 },
  { word: "neighbor", phonetic: "/ˈneɪbər/", meaning: "n. 邻居", english_meaning: "someone who lives near you", example: "Our neighbors are very friendly.", example_translation: "我们的邻居很友好。", pos: "noun", difficulty: 1, category: "daily", phet_sim_id: "charges-and-fields", phet_context: "电荷也有邻居？看看电场 →", frequency: 2800 },
  { word: "furniture", phonetic: "/ˈfɜːrnɪtʃər/", meaning: "n. 家具", english_meaning: "chairs, tables, beds, etc. used in a house", example: "We bought some new furniture for the living room.", example_translation: "我们给客厅买了些新家具。", pos: "noun", difficulty: 2, category: "daily", phet_sim_id: "masses-and-springs", phet_context: "弹簧上的东西像弹力沙发？拉拉看 →", frequency: 3200 },
  { word: "comfortable", phonetic: "/ˈkʌmftəbəl/", meaning: "adj. 舒适的", english_meaning: "making you feel relaxed and pleasant", example: "This sofa is very comfortable.", example_translation: "这个沙发很舒适。", pos: "adjective", difficulty: 2, category: "daily", phet_sim_id: "forces-and-motion-basics", phet_context: "推箱子没摩擦力才舒服？试试看 →", frequency: 1900 },
  { word: "convenient", phonetic: "/kənˈviːniənt/", meaning: "adj. 方便的", english_meaning: "easy to use or suitable for a purpose", example: "Online shopping is very convenient.", example_translation: "网上购物很方便。", pos: "adjective", difficulty: 2, category: "daily", phet_sim_id: "circuit-construction-kit-dc", phet_context: "电路接通了才方便用电器，试试搭一个 →", frequency: 2100 },
  { word: "environment", phonetic: "/ɪnˈvaɪrənmənt/", meaning: "n. 环境", english_meaning: "the conditions that affect the behavior and development of something", example: "We should protect our environment.", example_translation: "我们应该保护环境。", pos: "noun", difficulty: 2, category: "daily", phet_sim_id: "greenhouse-effect", phet_context: "试试看温室气体怎么让地球变暖 →", frequency: 1200 },
  { word: "habit", phonetic: "/ˈhæbɪt/", meaning: "n. 习惯", english_meaning: "something you do regularly, often without thinking", example: "Reading before bed is a good habit.", example_translation: "睡前阅读是个好习惯。", pos: "noun", difficulty: 1, category: "daily", phet_sim_id: "natural-selection", phet_context: "兔子的习惯也能遗传？看看自然选择 →", frequency: 1700 },
  { word: "private", phonetic: "/ˈpraɪvət/", meaning: "adj. 私人的；私密的", english_meaning: "belonging to one person, not public", example: "Please respect my private space.", example_translation: "请尊重我的私人空间。", pos: "adjective", difficulty: 2, category: "daily", phet_sim_id: "gas-properties", phet_context: "细胞有私密的膜通道 →", frequency: 1500 },
  { word: "ordinary", phonetic: "/ˈɔːrdneri/", meaning: "adj. 普通的；平凡的", english_meaning: "not special or different from normal", example: "She seems like an ordinary student, but she is actually a genius.", example_translation: "她看起来像普通学生，但其实是个天才。", pos: "adjective", difficulty: 2, category: "daily", phet_sim_id: "density", phet_context: "普通木头和铁，密度大不同 →", frequency: 2400 },
  { word: "familiar", phonetic: "/fəˈmɪliər/", meaning: "adj. 熟悉的", english_meaning: "well known to you", example: "The song sounds familiar to me.", example_translation: "这首歌我听着很熟悉。", pos: "adjective", difficulty: 2, category: "daily", phet_sim_id: "wave-interference", phet_context: "熟悉的声波叠加在一起 →", frequency: 2200 },
  { word: "adjust", phonetic: "/əˈdʒʌst/", meaning: "v. 调整；适应", english_meaning: "to change slightly so it works better", example: "You need to adjust your schedule.", example_translation: "你需要调整你的时间表。", pos: "verb", difficulty: 2, category: "daily", phet_sim_id: "graphing-lines", phet_context: "调整参数看直线变化 →", frequency: 2500 },
  { word: "household", phonetic: "/ˈhaʊshoʊld/", meaning: "n. 家庭；adj. 家用的", english_meaning: "relating to looking after a house", example: "She does most of the household chores.", example_translation: "她做大部分家务。", pos: "noun", difficulty: 3, category: "daily", phet_sim_id: "circuit-construction-kit-dc", phet_context: "家用电路是怎么接的？搭一个 →", frequency: 3800 },
  { word: "afford", phonetic: "/əˈfɔːrd/", meaning: "v. 买得起；承担得起", english_meaning: "to have enough money to buy something", example: "I can't afford a new phone right now.", example_translation: "我现在买不起新手机。", pos: "verb", difficulty: 2, category: "daily", phet_sim_id: "graphing-lines", phet_context: "买几个能负担？算算比例 →", frequency: 2300 },
  { word: "replace", phonetic: "/rɪˈpleɪs/", meaning: "v. 替换；取代", english_meaning: "to take the place of something", example: "The old bridge was replaced by a new one.", example_translation: "旧桥被新桥取代了。", pos: "verb", difficulty: 2, category: "daily", phet_sim_id: "gas-properties", phet_context: "化学反应中反应物被替换成产物 →", frequency: 2000 },

  // 📚 校园学习 campus
  { word: "campus", phonetic: "/ˈkæmpəs/", meaning: "n. 校园", english_meaning: "the buildings and land of a university or school", example: "The campus is very beautiful in autumn.", example_translation: "秋天的校园很美。", pos: "noun", difficulty: 1, category: "campus", phet_sim_id: "", phet_context: "", frequency: 2900 },
  { word: "curriculum", phonetic: "/kəˈrɪkjələm/", meaning: "n. 课程", english_meaning: "the subjects that are taught in a school", example: "The school has added computer science to its curriculum.", example_translation: "学校把计算机科学加入了课程。", pos: "noun", difficulty: 3, category: "campus", phet_sim_id: "", phet_context: "", frequency: 4200 },
  { word: "knowledge", phonetic: "/ˈnɑːlɪdʒ/", meaning: "n. 知识", english_meaning: "information and understanding gained through learning", example: "Knowledge is power.", example_translation: "知识就是力量。", pos: "noun", difficulty: 1, category: "campus", phet_sim_id: "build-an-atom", phet_context: "亲手搭原子，获取新知识 →", frequency: 1100 },
  { word: "graduate", phonetic: "/ˈɡrædʒueɪt/", meaning: "v. 毕业；n. 毕业生", english_meaning: "to complete a degree; someone who has completed a degree", example: "She graduated from Tsinghua University last year.", example_translation: "她去年从清华大学毕业。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 2600 },
  { word: "scholarship", phonetic: "/ˈskɑːlərʃɪp/", meaning: "n. 奖学金", english_meaning: "money given to a student to help pay for education", example: "She won a scholarship to study abroad.", example_translation: "她获得了出国留学的奖学金。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 3300 },
  { word: "assignment", phonetic: "/əˈsaɪnmənt/", meaning: "n. 作业；任务", english_meaning: "a piece of work given to students", example: "The assignment is due next Monday.", example_translation: "作业下周一交。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 3100 },
  { word: "concentrate", phonetic: "/ˈkɑːnsntreɪt/", meaning: "v. 集中注意力", english_meaning: "to focus your attention on something", example: "I can't concentrate with all this noise.", example_translation: "这么吵我无法集中注意力。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "gas-properties", phet_context: "点开看看溶液怎么变浓 →", frequency: 2700 },
  { word: "achieve", phonetic: "/əˈtʃiːv/", meaning: "v. 达到；实现", english_meaning: "to successfully complete something", example: "She achieved her goal of getting into a top university.", example_translation: "她实现了考入顶尖大学的目标。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 1600 },
  { word: "progress", phonetic: "/ˈprɑːɡres/", meaning: "n. 进步；v. 前进", english_meaning: "the process of improving or developing", example: "She has made great progress in English this semester.", example_translation: "她这学期英语进步很大。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 1400 },
  { word: "research", phonetic: "/ˈriːsɜːrtʃ/", meaning: "n./v. 研究", english_meaning: "the study of a subject to discover new facts", example: "The research shows that reading improves vocabulary.", example_translation: "研究表明阅读能扩大词汇量。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "build-an-atom", phet_context: "像科学家一样研究分子形状 →", frequency: 1300 },
  { word: "discipline", phonetic: "/ˈdɪsəplɪn/", meaning: "n. 纪律；学科；v. 惩罚", english_meaning: "the practice of training people to follow rules", example: "Self-discipline is the key to success.", example_translation: "自律是成功的关键。", pos: "noun", difficulty: 3, category: "campus", phet_sim_id: "", phet_context: "", frequency: 3000 },
  { word: "method", phonetic: "/ˈmeθəd/", meaning: "n. 方法", english_meaning: "a particular way of doing something", example: "This method is more effective than the old one.", example_translation: "这个方法比旧的更有效。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "forces-and-motion-basics", phet_context: "用不同方法推箱子，效果不一样 →", frequency: 1500 },
  { word: "debate", phonetic: "/dɪˈbeɪt/", meaning: "n./v. 辩论；讨论", english_meaning: "a formal discussion on a particular topic", example: "We had a heated debate about the topic.", example_translation: "我们就这个话题进行了激烈的辩论。", pos: "noun", difficulty: 2, category: "campus", phet_sim_id: "forces-and-motion-basics", phet_context: "两个物体碰撞就像辩论？看看结果 →", frequency: 2600 },
  { word: "inspire", phonetic: "/ɪnˈspaɪər/", meaning: "v. 激励；启发", english_meaning: "to give someone the desire to do something", example: "Her story inspired many young people.", example_translation: "她的故事激励了很多年轻人。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 2100 },
  { word: "improve", phonetic: "/ɪmˈpruːv/", meaning: "v. 改善；提高", english_meaning: "to make or become better", example: "She wants to improve her English speaking skills.", example_translation: "她想提高英语口语能力。", pos: "verb", difficulty: 1, category: "campus", phet_sim_id: "forces-and-motion-basics", phet_context: "减小摩擦力就能改善运动？试试 →", frequency: 800 },
  { word: "suggest", phonetic: "/səˈdʒest/", meaning: "v. 建议；暗示", english_meaning: "to put forward an idea for consideration", example: "I suggest we leave early to avoid traffic.", example_translation: "我建议早点出发以避开交通堵塞。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 900 },
  { word: "consider", phonetic: "/kənˈsɪdər/", meaning: "v. 考虑；认为", english_meaning: "to think carefully about something", example: "Please consider my application.", example_translation: "请考虑我的申请。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 1000 },
  { word: "demonstrate", phonetic: "/ˈdemənstreɪt/", meaning: "v. 证明；演示", english_meaning: "to show clearly", example: "The experiment demonstrates the principle of gravity.", example_translation: "实验证明了重力原理。", pos: "verb", difficulty: 3, category: "campus", phet_sim_id: "forces-and-motion-basics", phet_context: "演示给你看引力怎么工作 →", frequency: 2800 },
  { word: "participate", phonetic: "/pɑːrˈtɪsɪpeɪt/", meaning: "v. 参加", english_meaning: "to take part in an activity", example: "All students should participate in class discussions.", example_translation: "所有学生都应参加课堂讨论。", pos: "verb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 2100 },
  { word: "acquire", phonetic: "/əˈkwaɪər/", meaning: "v. 获得；习得", english_meaning: "to get something, especially by effort", example: "Children acquire language naturally.", example_translation: "儿童自然地习得语言。", pos: "verb", difficulty: 3, category: "campus", phet_sim_id: "build-an-atom", phet_context: "获取新分子就像习得新知识 →", frequency: 3000 },
  { word: "moreover", phonetic: "/mɔːrˈoʊvər/", meaning: "adv. 此外；而且", english_meaning: "used to add information", example: "The hotel was cheap. Moreover, it was very clean.", example_translation: "这家酒店很便宜，而且很干净。", pos: "adverb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 3500 },
  { word: "therefore", phonetic: "/ˈðerfɔːr/", meaning: "adv. 因此", english_meaning: "as a result of that", example: "He didn't study; therefore, he failed the exam.", example_translation: "他没有学习，因此考试不及格。", pos: "adverb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 1800 },
  { word: "meanwhile", phonetic: "/ˈmiːnwaɪl/", meaning: "adv. 与此同时", english_meaning: "at the same time", example: "I was doing homework. Meanwhile, my brother was playing games.", example_translation: "我在做作业，与此同时我弟弟在玩游戏。", pos: "adverb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 2200 },
  { word: "otherwise", phonetic: "/ˈʌðərwaɪz/", meaning: "adv. 否则", english_meaning: "if not; or else", example: "Hurry up, otherwise we'll be late.", example_translation: "快点，否则我们要迟到了。", pos: "adverb", difficulty: 2, category: "campus", phet_sim_id: "", phet_context: "", frequency: 1900 },

  // ❤️ 情感态度 emotion
  { word: "confident", phonetic: "/ˈkɑːnfɪdənt/", meaning: "adj. 自信的", english_meaning: "feeling sure about your abilities", example: "Be confident and you will succeed.", example_translation: "自信一点，你会成功的。", pos: "adjective", difficulty: 2, category: "emotion", phet_sim_id: "forces-and-motion-basics", phet_context: "自信地让跷跷板保持平衡 →", frequency: 2200 },
  { word: "anxious", phonetic: "/ˈæŋkʃəs/", meaning: "adj. 焦虑的；渴望的", english_meaning: "worried or nervous about something", example: "She was anxious about the exam results.", example_translation: "她对考试结果感到焦虑。", pos: "adjective", difficulty: 2, category: "emotion", phet_sim_id: "", phet_context: "", frequency: 2800 },
  { word: "grateful", phonetic: "/ˈɡreɪtfəl/", meaning: "adj. 感激的", english_meaning: "feeling thankful for something", example: "I'm grateful for your help.", example_translation: "我很感激你的帮助。", pos: "adjective", difficulty: 2, category: "emotion", phet_sim_id: "", phet_context: "", frequency: 3100 },
  { word: "embarrassed", phonetic: "/ɪmˈberəst/", meaning: "adj. 尴尬的", english_meaning: "feeling uncomfortable or ashamed", example: "He was embarrassed when he forgot her name.", example_translation: "他忘了她的名字，很尴尬。", pos: "adjective", difficulty: 3, category: "emotion", phet_sim_id: "", phet_context: "", frequency: 3800 },
  { word: "enthusiastic", phonetic: "/ɪnˌθuːziˈæstɪk/", meaning: "adj. 热情的", english_meaning: "showing a lot of excitement and interest", example: "She is very enthusiastic about learning English.", example_translation: "她对学英语充满热情。", pos: "adjective", difficulty: 3, category: "emotion", phet_sim_id: "", phet_context: "", frequency: 4200 },
  { word: "frustrated", phonetic: "/ˈfrʌstreɪtɪd/", meaning: "adj. 沮丧的", english_meaning: "feeling annoyed because you can't achieve something", example: "He felt frustrated when he failed again.", example_translation: "再次失败时他感到沮丧。", pos: "adjective", difficulty: 3, category: "emotion", phet_sim_id: "forces-and-motion-basics", phet_context: "摩擦力让人沮丧？关掉摩擦力试试 →", frequency: 3600 },
  { word: "curious", phonetic: "/ˈkjʊriəs/", meaning: "adj. 好奇的", english_meaning: "wanting to know about something", example: "Children are naturally curious about the world.", example_translation: "孩子们天生对世界充满好奇。", pos: "adjective", difficulty: 2, category: "emotion", phet_sim_id: "build-an-atom", phet_context: "好奇原子长啥样？亲手搭一个 →", frequency: 2700 },
  { word: "relieved", phonetic: "/rɪˈliːvd/", meaning: "adj. 宽慰的；松了一口气的", english_meaning: "feeling happy because something bad didn't happen", example: "I was so relieved to hear she was safe.", example_translation: "听说她安全了，我松了口气。", pos: "adjective", difficulty: 3, category: "emotion", phet_sim_id: "gas-properties", phet_context: "压力减小就松了口气？感受一下 →", frequency: 4100 },
  { word: "determine", phonetic: "/dɪˈtɜːrmɪn/", meaning: "v. 决定；下定决心", english_meaning: "to decide firmly to do something", example: "She was determined to pass the exam.", example_translation: "她下定决心要通过考试。", pos: "verb", difficulty: 2, category: "emotion", phet_sim_id: "forces-and-motion-basics", phet_context: "什么决定了抛物线轨迹？调调看 →", frequency: 1800 },
  { word: "appreciate", phonetic: "/əˈpriːʃieɪt/", meaning: "v. 感激；欣赏", english_meaning: "to recognize the value of something", example: "I really appreciate your support.", example_translation: "我非常感激你的支持。", pos: "verb", difficulty: 2, category: "emotion", phet_sim_id: "geometric-optics", phet_context: "欣赏不同光波长带来的色彩 →", frequency: 1700 },
  { word: "passion", phonetic: "/ˈpæʃn/", meaning: "n. 热情；激情", english_meaning: "a strong feeling of enthusiasm", example: "She has a passion for music.", example_translation: "她对音乐充满热情。", pos: "noun", difficulty: 2, category: "emotion", phet_sim_id: "wave-interference", phet_context: "音乐的激情来自声波，看看波怎么动 →", frequency: 2000 },
  { word: "sympathy", phonetic: "/ˈsɪmpəθi/", meaning: "n. 同情", english_meaning: "understanding and caring about someone's problems", example: "He expressed his sympathy for the victims.", example_translation: "他对受害者表示同情。", pos: "noun", difficulty: 3, category: "emotion", phet_sim_id: "", phet_context: "", frequency: 3700 },

  // 🌿 自然环保 nature
  { word: "climate", phonetic: "/ˈklaɪmət/", meaning: "n. 气候", english_meaning: "the regular weather conditions of a place", example: "Climate change is a serious global issue.", example_translation: "气候变化是一个严重的全球性问题。", pos: "noun", difficulty: 2, category: "nature", phet_sim_id: "greenhouse-effect", phet_context: "看看温室效应是怎么回事 →", frequency: 2000 },
  { word: "pollution", phonetic: "/pəˈluːʃn/", meaning: "n. 污染", english_meaning: "the process of making air, water, etc. dirty", example: "Air pollution is a major problem in big cities.", example_translation: "空气污染是大城市的主要问题。", pos: "noun", difficulty: 2, category: "nature", phet_sim_id: "gas-properties", phet_context: "污染物浓度越高越危险，看看浓度 →", frequency: 2600 },
  { word: "resource", phonetic: "/ˈriːsɔːrs/", meaning: "n. 资源", english_meaning: "something that can be used to help you", example: "We should use natural resources wisely.", example_translation: "我们应该合理利用自然资源。", pos: "noun", difficulty: 2, category: "nature", phet_sim_id: "gas-properties", phet_context: "能源也是资源，看看能量怎么转换 →", frequency: 1800 },
  { word: "species", phonetic: "/ˈspiːʃiːz/", meaning: "n. 物种", english_meaning: "a group of animals or plants that are similar", example: "Many species are in danger of extinction.", example_translation: "许多物种面临灭绝的危险。", pos: "noun", difficulty: 3, category: "nature", phet_sim_id: "natural-selection", phet_context: "体验自然选择怎么起作用 →", frequency: 3200 },
  { word: "survive", phonetic: "/sərˈvaɪv/", meaning: "v. 幸存；存活", english_meaning: "to continue to live despite difficulties", example: "Only the strongest can survive in the wild.", example_translation: "只有最强壮的才能在野外存活。", pos: "verb", difficulty: 2, category: "nature", phet_sim_id: "natural-selection", phet_context: "谁能存活？自然选择说了算 →", frequency: 1900 },
  { word: "disaster", phonetic: "/dɪˈzæstər/", meaning: "n. 灾难", english_meaning: "a sudden event causing great damage", example: "The earthquake was one of the worst disasters in history.", example_translation: "那次地震是历史上最严重的灾难之一。", pos: "noun", difficulty: 2, category: "nature", phet_sim_id: "wave-interference", phet_context: "海啸是波的叠加灾难，看看波干涉 →", frequency: 2300 },
  { word: "recycle", phonetic: "/ˌriːˈsaɪkəl/", meaning: "v. 回收利用", english_meaning: "to treat waste so it can be used again", example: "We should recycle paper and plastic.", example_translation: "我们应该回收纸张和塑料。", pos: "verb", difficulty: 2, category: "nature", phet_sim_id: "gas-properties", phet_context: "能量也能回收再利用？看看能量循环 →", frequency: 3400 },
  { word: "landscape", phonetic: "/ˈlændskeɪp/", meaning: "n. 风景；景色", english_meaning: "the visible features of an area of land", example: "The landscape of the countryside is breathtaking.", example_translation: "乡村的风景令人叹为观止。", pos: "noun", difficulty: 3, category: "nature", phet_sim_id: "", phet_context: "", frequency: 3500 },
  { word: "drought", phonetic: "/draʊt/", meaning: "n. 干旱", english_meaning: "a long period without rain", example: "The drought has caused crops to fail.", example_translation: "干旱导致庄稼歉收。", pos: "noun", difficulty: 3, category: "nature", phet_sim_id: "", phet_context: "", frequency: 4400 },
  { word: "sustainable", phonetic: "/səˈsteɪnəbəl/", meaning: "adj. 可持续的", english_meaning: "able to continue over a period of time without harming the environment", example: "We need sustainable development.", example_translation: "我们需要可持续发展。", pos: "adjective", difficulty: 3, category: "nature", phet_sim_id: "", phet_context: "", frequency: 3000 },

  // 🏛️ 社会文化 society
  { word: "culture", phonetic: "/ˈkʌltʃər/", meaning: "n. 文化", english_meaning: "the beliefs, customs, and arts of a society", example: "Chinese culture has a long history.", example_translation: "中国文化历史悠久。", pos: "noun", difficulty: 1, category: "society", phet_sim_id: "natural-selection", phet_context: "文化也在\"自然选择\"中演化 →", frequency: 1200 },
  { word: "tradition", phonetic: "/trəˈdɪʃn/", meaning: "n. 传统", english_meaning: "beliefs or customs passed from generation to generation", example: "It's a tradition to eat dumplings during the Spring Festival.", example_translation: "春节吃饺子是传统。", pos: "noun", difficulty: 2, category: "society", phet_sim_id: "natural-selection", phet_context: "传统代代相传，特征也能遗传 →", frequency: 1800 },
  { word: "community", phonetic: "/kəˈmjuːnəti/", meaning: "n. 社区；共同体", english_meaning: "a group of people living in the same area", example: "The community organized a charity event.", example_translation: "社区组织了一次慈善活动。", pos: "noun", difficulty: 2, category: "society", phet_sim_id: "", phet_context: "", frequency: 1600 },
  { word: "volunteer", phonetic: "/ˌvɑːlənˈtɪr/", meaning: "n. 志愿者；v. 自愿做", english_meaning: "someone who does work without being paid", example: "She works as a volunteer at the hospital.", example_translation: "她在医院当志愿者。", pos: "noun", difficulty: 2, category: "society", phet_sim_id: "", phet_context: "", frequency: 2200 },
  { word: "contribute", phonetic: "/kənˈtrɪbjuːt/", meaning: "v. 贡献；捐助", english_meaning: "to give something to help achieve a goal", example: "Everyone should contribute to society.", example_translation: "每个人都应该为社会做贡献。", pos: "verb", difficulty: 2, category: "society", phet_sim_id: "gas-properties", phet_context: "每个反应物都贡献一份力 →", frequency: 1900 },
  { word: "equality", phonetic: "/ɪˈkwɑːləti/", meaning: "n. 平等", english_meaning: "the state of being equal in rights and status", example: "Gender equality is important in modern society.", example_translation: "性别平等在现代社会很重要。", pos: "noun", difficulty: 3, category: "society", phet_sim_id: "forces-and-motion-basics", phet_context: "天平两边平等才能平衡 →", frequency: 3200 },
  { word: "justice", phonetic: "/ˈdʒʌstɪs/", meaning: "n. 正义；公平", english_meaning: "fairness in the way people are treated", example: "Everyone deserves justice.", example_translation: "每个人都应得到公正对待。", pos: "noun", difficulty: 3, category: "society", phet_sim_id: "forces-and-motion-basics", phet_context: "公平就像天平两端一样 →", frequency: 2800 },
  { word: "heritage", phonetic: "/ˈherɪtɪdʒ/", meaning: "n. 遗产；传统", english_meaning: "things from the past that are valued today", example: "The Great Wall is a world cultural heritage site.", example_translation: "长城是世界文化遗产。", pos: "noun", difficulty: 3, category: "society", phet_sim_id: "natural-selection", phet_context: "遗传遗产就像基因的传承 →", frequency: 3600 },
  { word: "diverse", phonetic: "/daɪˈvɜːrs/", meaning: "adj. 多样的；不同的", english_meaning: "very different from each other", example: "China is a country with diverse cultures.", example_translation: "中国是一个文化多样的国家。", pos: "adjective", difficulty: 3, category: "society", phet_sim_id: "natural-selection", phet_context: "多样的特征让种群更适应环境 →", frequency: 2600 },
  { word: "phenomenon", phonetic: "/fɪˈnɑːmɪnən/", meaning: "n. 现象", english_meaning: "something that happens or exists", example: "Global warming is a well-known phenomenon.", example_translation: "全球变暖是众所周知的现象。", pos: "noun", difficulty: 3, category: "society", phet_sim_id: "wave-interference", phet_context: "波就是一个物理现象，抖抖绳子看看 →", frequency: 3000 },
  { word: "represent", phonetic: "/ˌreprɪˈzent/", meaning: "v. 代表；象征", english_meaning: "to act or speak on behalf of someone", example: "The red color represents courage.", example_translation: "红色代表勇气。", pos: "verb", difficulty: 2, category: "society", phet_sim_id: "graphing-lines", phet_context: "方程代表一条直线，图形代表数据 →", frequency: 1700 },
  { word: "investigate", phonetic: "/ɪnˈvestɪɡeɪt/", meaning: "v. 调查；研究", english_meaning: "to examine something carefully", example: "The police are investigating the case.", example_translation: "警方正在调查此案。", pos: "verb", difficulty: 3, category: "society", phet_sim_id: "build-an-atom", phet_context: "像侦探一样调查原子的秘密 →", frequency: 3100 },
  { word: "communicate", phonetic: "/kəˈmjuːnɪkeɪt/", meaning: "v. 交流；沟通", english_meaning: "to share information with others", example: "It's important to communicate with your parents.", example_translation: "和父母沟通很重要。", pos: "verb", difficulty: 2, category: "society", phet_sim_id: "wave-interference", phet_context: "声波就是一种沟通方式，抖抖绳子 →", frequency: 1600 },

  // ✈️ 旅行交通 travel
  { word: "destination", phonetic: "/ˌdestɪˈneɪʃn/", meaning: "n. 目的地", english_meaning: "the place you are traveling to", example: "Paris is a popular tourist destination.", example_translation: "巴黎是热门旅游目的地。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "forces-and-motion-basics", phet_context: "球的落点就是目的地，改变角度看看 →", frequency: 2600 },
  { word: "accommodation", phonetic: "/əˌkɑːməˈdeɪʃn/", meaning: "n. 住宿", english_meaning: "a place to live or stay", example: "We need to book accommodation in advance.", example_translation: "我们需要提前预订住宿。", pos: "noun", difficulty: 3, category: "travel", phet_sim_id: "", phet_context: "", frequency: 3200 },
  { word: "luggage", phonetic: "/ˈlʌɡɪdʒ/", meaning: "n. 行李", english_meaning: "bags and cases you carry when traveling", example: "Please keep your luggage with you at all times.", example_translation: "请随时看管好你的行李。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "masses-and-springs", phet_context: "行李太重弹簧会怎样？挂挂看 →", frequency: 3400 },
  { word: "schedule", phonetic: "/ˈskedʒuːl/", meaning: "n. 时间表；v. 安排", english_meaning: "a plan that lists events and their times", example: "The flight schedule has been changed.", example_translation: "航班时刻表已更改。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "graphing-lines", phet_context: "位置随时间的变化就是时刻表 →", frequency: 1800 },
  { word: "scenery", phonetic: "/ˈsiːnəri/", meaning: "n. 风景", english_meaning: "the natural features of a landscape", example: "The scenery along the river is beautiful.", example_translation: "沿河的风景很美。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "geometric-optics", phet_context: "风景中的折射彩虹，看看光怎么弯 →", frequency: 3000 },
  { word: "departure", phonetic: "/dɪˈpɑːrtʃər/", meaning: "n. 离开；出发", english_meaning: "the act of leaving a place", example: "The departure time is 8:00 am.", example_translation: "出发时间是早上8点。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "forces-and-motion-basics", phet_context: "出发角度决定落点 →", frequency: 3100 },
  { word: "abroad", phonetic: "/əˈbrɔːd/", meaning: "adv. 在国外；到国外", english_meaning: "in or to a foreign country", example: "She plans to study abroad next year.", example_translation: "她计划明年出国留学。", pos: "adverb", difficulty: 2, category: "travel", phet_sim_id: "", phet_context: "", frequency: 1700 },
  { word: "transport", phonetic: "/ˈtrænspɔːrt/", meaning: "n. 交通；运输", english_meaning: "a system for moving people or goods", example: "Public transport in this city is very convenient.", example_translation: "这个城市的公共交通很方便。", pos: "noun", difficulty: 2, category: "travel", phet_sim_id: "forces-and-motion-basics", phet_context: "运输就是用力推东西动起来 →", frequency: 2100 },
  { word: "navigate", phonetic: "/ˈnævɪɡeɪt/", meaning: "v. 导航；航行", english_meaning: "to find your way to a place", example: "We used GPS to navigate through the city.", example_translation: "我们用GPS在城市中导航。", pos: "verb", difficulty: 3, category: "travel", phet_sim_id: "charges-and-fields", phet_context: "电场线像导航路线？看看 →", frequency: 3800 },

  // 💪 健康运动 health
  { word: "pressure", phonetic: "/ˈpreʃər/", meaning: "n. 压力；压强", english_meaning: "the force produced by pressing", example: "She is under a lot of pressure at work.", example_translation: "她在工作中承受很大压力。", pos: "noun", difficulty: 2, category: "health", phet_sim_id: "gas-properties", phet_context: "感受一下水下的压力 →", frequency: 1200 },
  { word: "symptom", phonetic: "/ˈsɪmptəm/", meaning: "n. 症状", english_meaning: "a sign of illness or disease", example: "Fever is a common symptom of the flu.", example_translation: "发烧是流感的常见症状。", pos: "noun", difficulty: 3, category: "health", phet_sim_id: "geometric-optics", phet_context: "发烧是分子运动加快的症状 →", frequency: 3500 },
  { word: "recover", phonetic: "/rɪˈkʌvər/", meaning: "v. 恢复；康复", english_meaning: "to return to a normal state after being ill", example: "It took her two weeks to recover from the cold.", example_translation: "她花了两周才从感冒中恢复。", pos: "verb", difficulty: 2, category: "health", phet_sim_id: "gas-properties", phet_context: "能量可以恢复，看看能量循环 →", frequency: 2200 },
  { word: "nutritious", phonetic: "/nuːˈtrɪʃəs/", meaning: "adj. 有营养的", english_meaning: "containing many nutrients", example: "A balanced diet should be nutritious.", example_translation: "均衡的饮食应该是有营养的。", pos: "adjective", difficulty: 3, category: "health", phet_sim_id: "gas-properties", phet_context: "营养浓度高的食物更有营养 →", frequency: 4100 },
  { word: "energy", phonetic: "/ˈenərdʒi/", meaning: "n. 精力；能量", english_meaning: "the physical and mental strength to do things", example: "Eating breakfast gives you energy for the day.", example_translation: "吃早餐给你一天的能量。", pos: "noun", difficulty: 1, category: "health", phet_sim_id: "gas-properties", phet_context: "能量怎么变来变去？点开看看 →", frequency: 700 },
  { word: "balance", phonetic: "/ˈbæləns/", meaning: "n./v. 平衡", english_meaning: "a state where things are equal", example: "It's important to balance work and life.", example_translation: "平衡工作和生活很重要。", pos: "noun", difficulty: 2, category: "health", phet_sim_id: "forces-and-motion-basics", phet_context: "试试让跷跷板平衡 →", frequency: 1300 },
  { word: "stretch", phonetic: "/stretʃ/", meaning: "v. 伸展；延伸", english_meaning: "to make something longer or wider", example: "You should stretch before running.", example_translation: "跑步前应该拉伸。", pos: "verb", difficulty: 2, category: "health", phet_sim_id: "masses-and-springs", phet_context: "弹簧被拉伸会怎样？拉拉看 →", frequency: 2600 },
  { word: "immune", phonetic: "/ɪˈmjuːn/", meaning: "adj. 免疫的", english_meaning: "not affected by a disease", example: "Vaccines help make you immune to diseases.", example_translation: "疫苗帮助你免疫疾病。", pos: "adjective", difficulty: 3, category: "health", phet_sim_id: "gas-properties", phet_context: "细胞膜是免疫的第一道防线 →", frequency: 3800 },
  { word: "prescription", phonetic: "/prɪˈskrɪpʃn/", meaning: "n. 处方", english_meaning: "a doctor's written order for medicine", example: "You need a prescription to buy this medicine.", example_translation: "买这种药需要处方。", pos: "noun", difficulty: 3, category: "health", phet_sim_id: "density", phet_context: "药物的酸碱性影响药效 →", frequency: 4200 },
  { word: "stamina", phonetic: "/ˈstæmɪnə/", meaning: "n. 耐力；体力", english_meaning: "the ability to do physical activity for a long time", example: "Running builds stamina.", example_translation: "跑步能增强耐力。", pos: "noun", difficulty: 3, category: "health", phet_sim_id: "gas-properties", phet_context: "耐力就是持续输出能量的能力 →", frequency: 4500 },

  // 🍔 饮食购物 food
  { word: "appetite", phonetic: "/ˈæpɪtaɪt/", meaning: "n. 食欲；胃口", english_meaning: "the desire to eat food", example: "Exercise can improve your appetite.", example_translation: "运动能增进食欲。", pos: "noun", difficulty: 2, category: "food", phet_sim_id: "gas-properties", phet_context: "胃口好才能补充能量 →", frequency: 3400 },
  { word: "ingredient", phonetic: "/ɪnˈɡriːdiənt/", meaning: "n. 成分；配料", english_meaning: "one of the foods used to make a dish", example: "The main ingredient of this soup is tomato.", example_translation: "这个汤的主要配料是番茄。", pos: "noun", difficulty: 3, category: "food", phet_sim_id: "gas-properties", phet_context: "配料像化学反应的反应物 →", frequency: 3200 },
  { word: "recipe", phonetic: "/ˈresəpi/", meaning: "n. 食谱；配方", english_meaning: "instructions for cooking a dish", example: "Can you share the recipe for this cake?", example_translation: "你能分享这个蛋糕的食谱吗？", pos: "noun", difficulty: 3, category: "food", phet_sim_id: "gas-properties", phet_context: "配方比例就是浓度，调调看 →", frequency: 3000 },
  { word: "delicious", phonetic: "/dɪˈlɪʃəs/", meaning: "adj. 美味的", english_meaning: "very pleasant to taste", example: "The food at that restaurant is delicious.", example_translation: "那家餐厅的食物很美味。", pos: "adjective", difficulty: 1, category: "food", phet_sim_id: "geometric-optics", phet_context: "美味来自分子和味蕾的互动 →", frequency: 2100 },
  { word: "bargain", phonetic: "/ˈbɑːrɡɪn/", meaning: "n. 便宜货；v. 讨价还价", english_meaning: "something sold for less than its usual price", example: "This dress was a real bargain.", example_translation: "这条裙子真划算。", pos: "noun", difficulty: 2, category: "food", phet_sim_id: "graphing-lines", phet_context: "划算就是性价比高？算算比例 →", frequency: 3500 },
  { word: "consume", phonetic: "/kənˈsuːm/", meaning: "v. 消耗；消费", english_meaning: "to eat, drink, or use something", example: "We consume too much sugar every day.", example_translation: "我们每天消耗太多糖。", pos: "verb", difficulty: 3, category: "food", phet_sim_id: "gas-properties", phet_context: "吃饭就是消耗能量？看看能量守恒 →", frequency: 2800 },
  { word: "discount", phonetic: "/ˈdɪskaʊnt/", meaning: "n. 折扣", english_meaning: "a reduction in the usual price", example: "Students get a 20% discount.", example_translation: "学生享受八折优惠。", pos: "noun", difficulty: 2, category: "food", phet_sim_id: "graphing-lines", phet_context: "打八折就是80%？分数匹配看看 →", frequency: 2400 },
  { word: "organic", phonetic: "/ɔːrˈɡænɪk/", meaning: "adj. 有机的；绿色的", english_meaning: "produced without using artificial chemicals", example: "Organic vegetables are more expensive but healthier.", example_translation: "有机蔬菜更贵但更健康。", pos: "adjective", difficulty: 3, category: "food", phet_sim_id: "build-an-atom", phet_context: "有机物就是含碳的分子，搭搭看 →", frequency: 3100 },
  { word: "flavor", phonetic: "/ˈfleɪvər/", meaning: "n. 味道；风味", english_meaning: "the particular taste of food or drink", example: "What's your favorite ice cream flavor?", example_translation: "你最喜欢什么口味的冰淇淋？", pos: "noun", difficulty: 2, category: "food", phet_sim_id: "density", phet_context: "酸味就是pH低？测测看 →", frequency: 2700 },
  { word: "portion", phonetic: "/ˈpɔːrʃn/", meaning: "n. 一份；部分", english_meaning: "an amount of food for one person", example: "The portions at this restaurant are very generous.", example_translation: "这家餐厅的份量很足。", pos: "noun", difficulty: 2, category: "food", phet_sim_id: "graphing-lines", phet_context: "一份就是几分之几？分数匹配 →", frequency: 3600 },

  // 💼 职业工作 work
  { word: "profession", phonetic: "/prəˈfeʃn/", meaning: "n. 职业；专业", english_meaning: "a type of job that needs special training", example: "Teaching is a noble profession.", example_translation: "教学是崇高的职业。", pos: "noun", difficulty: 2, category: "work", phet_sim_id: "circuit-construction-kit-dc", phet_context: "电工是专业职业，搭个电路试试 →", frequency: 2000 },
  { word: "candidate", phonetic: "/ˈkændɪdət/", meaning: "n. 候选人", english_meaning: "someone who is being considered for a job", example: "There are five candidates for the position.", example_translation: "这个职位有五个候选人。", pos: "noun", difficulty: 3, category: "work", phet_sim_id: "", phet_context: "", frequency: 2800 },
  { word: "responsibility", phonetic: "/rɪˌspɑːnsəˈbɪləti/", meaning: "n. 责任；职责", english_meaning: "something you must do as part of your job", example: "It's your responsibility to finish the project on time.", example_translation: "按时完成项目是你的责任。", pos: "noun", difficulty: 2, category: "work", phet_sim_id: "", phet_context: "", frequency: 1400 },
  { word: "qualify", phonetic: "/ˈkwɑːlɪfaɪ/", meaning: "v. 有资格；使合格", english_meaning: "to have the right skills or knowledge", example: "She qualified as a doctor last year.", example_translation: "她去年取得了医生资格。", pos: "verb", difficulty: 3, category: "work", phet_sim_id: "circuit-construction-kit-dc", phet_context: "合格的电路才能通电，搭搭看 →", frequency: 3200 },
  { word: "salary", phonetic: "/ˈsæləri/", meaning: "n. 薪水", english_meaning: "money you earn from your job", example: "The company offers a competitive salary.", example_translation: "公司提供有竞争力的薪水。", pos: "noun", difficulty: 2, category: "work", phet_sim_id: "", phet_context: "", frequency: 2100 },
  { word: "promote", phonetic: "/prəˈmoʊt/", meaning: "v. 晋升；促进", english_meaning: "to give someone a higher position", example: "She was promoted to manager.", example_translation: "她被提升为经理。", pos: "verb", difficulty: 2, category: "work", phet_sim_id: "forces-and-motion-basics", phet_context: "促进就是加力推动，推推看 →", frequency: 1900 },
  { word: "colleague", phonetic: "/ˈkɑːliːɡ/", meaning: "n. 同事", english_meaning: "someone you work with", example: "My colleagues are very supportive.", example_translation: "我的同事们很支持我。", pos: "noun", difficulty: 2, category: "work", phet_sim_id: "", phet_context: "", frequency: 2600 },
  { word: "deadline", phonetic: "/ˈdedlaɪn/", meaning: "n. 截止日期", english_meaning: "the latest time by which something must be done", example: "We need to meet the deadline for this project.", example_translation: "我们必须赶上这个项目的截止日期。", pos: "noun", difficulty: 2, category: "work", phet_sim_id: "", phet_context: "", frequency: 2300 },
  { word: "efficient", phonetic: "/ɪˈfɪʃənt/", meaning: "adj. 高效的", english_meaning: "working well without wasting time or energy", example: "We need a more efficient system.", example_translation: "我们需要一个更高效的系统。", pos: "adjective", difficulty: 3, category: "work", phet_sim_id: "gas-properties", phet_context: "高效就是不浪费能量？看看能量转换 →", frequency: 2700 },
  { word: "entrepreneur", phonetic: "/ˌɑːntrəprəˈnɜːr/", meaning: "n. 企业家", english_meaning: "someone who starts their own business", example: "She is a successful entrepreneur.", example_translation: "她是一位成功的企业家。", pos: "noun", difficulty: 4, category: "work", phet_sim_id: "", phet_context: "", frequency: 4200 },

  // 📱 科技网络 tech
  { word: "artificial", phonetic: "/ˌɑːrtɪˈfɪʃəl/", meaning: "adj. 人工的；人造的", english_meaning: "made by humans, not natural", example: "Artificial intelligence is changing our lives.", example_translation: "人工智能正在改变我们的生活。", pos: "adjective", difficulty: 2, category: "tech", phet_sim_id: "build-an-atom", phet_context: "人工搭一个原子，跟自然界一样吗？→", frequency: 1900 },
  { word: "innovation", phonetic: "/ˌɪnəˈveɪʃn/", meaning: "n. 创新", english_meaning: "a new idea, method, or invention", example: "Technological innovation drives economic growth.", example_translation: "技术创新驱动经济增长。", pos: "noun", difficulty: 3, category: "tech", phet_sim_id: "", phet_context: "", frequency: 2500 },
  { word: "device", phonetic: "/dɪˈvaɪs/", meaning: "n. 设备；装置", english_meaning: "a piece of equipment made for a purpose", example: "Mobile devices have changed how we communicate.", example_translation: "移动设备改变了我们的沟通方式。", pos: "noun", difficulty: 2, category: "tech", phet_sim_id: "circuit-construction-kit-dc", phet_context: "动手搭个电路装置看看 →", frequency: 2100 },
  { word: "data", phonetic: "/ˈdeɪtə/", meaning: "n. 数据", english_meaning: "information stored on a computer", example: "The data shows an increase in online shopping.", example_translation: "数据显示网上购物在增加。", pos: "noun", difficulty: 1, category: "tech", phet_sim_id: "graphing-lines", phet_context: "数据画成图表更直观，试试画线 →", frequency: 900 },
  { word: "network", phonetic: "/ˈnetwɜːrk/", meaning: "n. 网络", english_meaning: "a system of connected computers", example: "The company's network was attacked by hackers.", example_translation: "公司的网络遭到黑客攻击。", pos: "noun", difficulty: 2, category: "tech", phet_sim_id: "circuit-construction-kit-dc", phet_context: "电路也是一种网络，搭搭看 →", frequency: 1500 },
  { word: "update", phonetic: "/ʌpˈdeɪt/", meaning: "v./n. 更新", english_meaning: "to make something more modern", example: "You should update your software regularly.", example_translation: "你应该定期更新软件。", pos: "verb", difficulty: 2, category: "tech", phet_sim_id: "", phet_context: "", frequency: 2200 },
  { word: "algorithm", phonetic: "/ˈælɡərɪðəm/", meaning: "n. 算法", english_meaning: "a set of rules for solving a problem on a computer", example: "Search engines use complex algorithms.", example_translation: "搜索引擎使用复杂的算法。", pos: "noun", difficulty: 4, category: "tech", phet_sim_id: "", phet_context: "", frequency: 3800 },
  { word: "virtual", phonetic: "/ˈvɜːrtʃuəl/", meaning: "adj. 虚拟的", english_meaning: "almost the same as the real thing, but not physical", example: "Virtual reality technology is developing rapidly.", example_translation: "虚拟现实技术正在快速发展。", pos: "adjective", difficulty: 3, category: "tech", phet_sim_id: "circuit-construction-kit-dc", phet_context: "这就是虚拟电路，但跟真的一样 →", frequency: 2400 },
  { word: "download", phonetic: "/ˈdaʊnloʊd/", meaning: "v./n. 下载", english_meaning: "to copy data from the internet to your computer", example: "You can download the app for free.", example_translation: "你可以免费下载这个应用。", pos: "verb", difficulty: 1, category: "tech", phet_sim_id: "", phet_context: "", frequency: 1800 },
  { word: "transform", phonetic: "/trænsˈfɔːrm/", meaning: "v. 转变；改造", english_meaning: "to change something completely", example: "Technology has transformed the way we live.", example_translation: "科技改变了我们的生活方式。", pos: "verb", difficulty: 3, category: "tech", phet_sim_id: "gas-properties", phet_context: "看看能量怎么转变 →", frequency: 2300 },
]

async function importWordLab() {
  console.log('🚀 WordLab 词库导入开始...')

  const SQL = await initSqlJs()
  let db

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 确保新字段存在
  const alterStatements = [
    `ALTER TABLE words ADD COLUMN category TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN english_meaning TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN phet_sim_id TEXT DEFAULT ''`,
    `ALTER TABLE words ADD COLUMN phet_context TEXT DEFAULT ''`
  ]
  for (const sql of alterStatements) {
    try { db.run(sql) } catch (e) { /* 已存在则忽略 */ }
  }

  // 创建"高中核心词汇"词库
  db.run(`INSERT OR IGNORE INTO vocabularies (id, name, description, category, level, word_count, is_public) VALUES (1, '高中核心词汇', '125个高考高频词汇，10个场景分类，12个互动模拟', 'wordlab', '高中', 125, 1)`)

  let imported = 0
  let skipped = 0
  let simCount = 0

  for (const w of WORDLAB_DATA) {
    // 检查是否已存在
    const existing = db.exec(`SELECT id FROM words WHERE word = ?`, [w.word])
    if (existing.length > 0 && existing[0].values.length > 0) {
      // 更新已有单词，添加新字段
      const wordId = existing[0].values[0][0]
      db.run(`
        UPDATE words SET
          category = ?, english_meaning = ?, phet_sim_id = ?, phet_context = ?,
          pos = ?, difficulty = ?, frequency = ?
        WHERE id = ?
      `, [w.category, w.english_meaning, w.phet_sim_id, w.phet_context, w.pos, w.difficulty, w.frequency, wordId])

      // 关联词库
      db.run(`INSERT OR IGNORE INTO vocabulary_words (vocabulary_id, word_id) VALUES (1, ?)`, [wordId])
      skipped++
    } else {
      // 插入新单词
      db.run(`
        INSERT INTO words (word, phonetic, pos, meaning, english_meaning, example, example_translation, difficulty, frequency, category, phet_sim_id, phet_context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [w.word, w.phonetic, w.pos, w.meaning, w.english_meaning, w.example, w.example_translation, w.difficulty, w.frequency, w.category, w.phet_sim_id, w.phet_context])

      const idResult = db.exec('SELECT last_insert_rowid() as id')
      const wordId = idResult.length > 0 ? idResult[0].values[0][0] : 0

      // 关联词库
      db.run(`INSERT OR IGNORE INTO vocabulary_words (vocabulary_id, word_id) VALUES (1, ?)`, [wordId])
      imported++
    }

    if (w.phet_sim_id) simCount++
  }

  // 更新词库单词数
  db.run(`UPDATE vocabularies SET word_count = ? WHERE id = 1`, [WORDLAB_DATA.length])

  // 保存数据库
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
  db.close()

  console.log(`\n✅ 导入完成！`)
  console.log(`   新增: ${imported} 词`)
  console.log(`   更新: ${skipped} 词`)
  console.log(`   含互动模拟: ${simCount} 词`)
  console.log(`   总计: ${WORDLAB_DATA.length} 词`)
  console.log(`   词库: 高中核心词汇 (id=1)`)
}

importWordLab().catch(err => {
  console.error('❌ 导入失败:', err)
  process.exit(1)
})
