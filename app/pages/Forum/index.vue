<template>
  <div class="forum-container">
    <h1 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1rem">
      Forum général
    </h1>
    <div class="chat-box">
      <div ref="messagesContainer" class="messages">
        <template v-for="(group, i) in groupedMessages" :key="i">
          <div
            class="message-group"
            :class="{
              mine: isMine(group.author),
              other: !isMine(group.author),
            }"
          >
            <div v-if="!isMine(group.author)" class="avatar">
              {{ getInitials(group.author) }}
            </div>
            <div class="bubbles">
              <template v-for="(msg, j) in group.messages" :key="msg.id">
                <div class="bubble">
                  <div v-if="j === 0" class="meta">
                    <span class="author">{{ group.author.split("@")[0] }}</span>
                    <span class="date">{{ formatDate(msg.created_at) }}</span>
                  </div>
                  <div class="content">{{ msg.content }}</div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
      <form class="send-form" @submit.prevent="sendMessage">
        <div class="input-group">
          <textarea
            v-model="newMessage"
            placeholder="Votre message..."
            required
          />
          <button
            class="emoji-btn"
            title="Emoji"
            type="button"
            @click="toggleEmojiPicker"
          >
            😊
          </button>
          <div v-if="showEmojiPicker" class="emoji-picker">
            <span
              v-for="emoji in emojis"
              :key="emoji"
              class="emoji"
              @click="addEmoji(emoji)"
              >{{ emoji }}</span
            >
          </div>
        </div>
        <button type="submit" :disabled="sending" class="send-btn">
          Envoyer
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrentUser } from "../../composables/useCurrentUser";
import { ref, onMounted, onUnmounted, nextTick } from "vue";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
type ForumMessage = {
  id: number;
  username: string;
  content: string;
  created_at: string;
};
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  await fetchMessages();
});

const messages = ref<ForumMessage[]>([]);
const messagesContainer = ref<HTMLDivElement | null>(null);
const newMessage = ref("");
const sending = ref(false);
let intervalId: ReturnType<typeof setInterval> | null = null;

// Emoji picker
const showEmojiPicker = ref(false);
const emojis = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😃",
  "😄",
  "😅",
  "😆",
  "😉",
  "😊",
  "😋",
  "😎",
  "😍",
  "😘",
  "🥰",
  "😗",
  "😙",
  "😚",
  "🙂",
  "🤗",
  "🤔",
  "😐",
  "😑",
  "😶",
  "🙄",
  "😏",
  "😣",
  "😥",
  "😮",
  "🤐",
  "😯",
  "😪",
  "😫",
  "🥱",
  "😴",
  "😌",
  "😛",
  "😜",
  "😝",
  "🤤",
  "😒",
  "😓",
  "😔",
  "😕",
  "🙃",
  "🤑",
  "😲",
  "☹️",
  "🙁",
  "😖",
  "😞",
  "😟",
  "😤",
  "😢",
  "😭",
  "😦",
  "😧",
  "😨",
  "😩",
  "🤯",
  "😬",
  "😰",
  "😱",
  "🥵",
  "🥶",
  "😳",
  "🤪",
  "😵",
  "😡",
  "😠",
  "🤬",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "😇",
  "🥳",
  "🥺",
  "🤠",
  "🤡",
  "🤥",
  "🤫",
  "🤭",
  "🧐",
  "🤓",
];
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}
function addEmoji(emoji: string) {
  newMessage.value += emoji;
  showEmojiPicker.value = false;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isMine(author: string) {
  if (!user.value) return false;
  const myName = user.value.user_metadata?.username || user.value.email;
  return author === myName;
}

function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Group messages by author consecutively
const groupedMessages = computed(() => {
  const groups: { author: string; messages: ForumMessage[] }[] = [];
  let lastAuthor: string | null = null;
  for (const msg of messages.value) {
    if (msg.username !== lastAuthor) {
      groups.push({ author: msg.username, messages: [msg] });
      lastAuthor = msg.username;
    } else if (groups.length > 0 && groups[groups.length - 1]) {
      groups[groups.length - 1]!.messages.push(msg);
    }
  }
  return groups;
});

async function fetchMessages() {
  const { data, error } = await supabase
    .from("forum_messages")
    .select("*")
    .eq("company_id", companyId.value)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!error && data) {
    messages.value = data.reverse();
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  }
}

async function sendMessage() {
  if (!user.value || !newMessage.value.trim()) return;
  sending.value = true;
  const { error } = await supabase.from("forum_messages").insert([
    {
      username: user.value.user_metadata?.username || user.value.email,
      content: newMessage.value.trim(),
      company_id: companyId.value,
    },
  ]);
  sending.value = false;
  if (!error) {
    newMessage.value = "";
    fetchMessages();
  }
}

onMounted(() => {
  fetchMessages();
  intervalId = setInterval(fetchMessages, 5000);
});
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
/* Layout */
.forum-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  height: 80vh;
  display: flex;
  flex-direction: column;
}
.chat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1rem;
  scrollbar-width: none; /* Firefox */
}
.messages::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
/* Champ d'envoi pro */
.send-form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  border-top: 1px solid #eee;
  padding-top: 1rem;
  position: sticky;
  bottom: 0;
  z-index: 2;
  width: 100%;
}
.input-group {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
textarea {
  flex: 1;
  min-height: 40px;
  resize: none;
  border-radius: 8px;
  border: 1px solid #ddd;
  padding: 0.5rem 2.5rem 0.5rem 0.5rem;
  font-size: 1em;
  transition: border-color 0.2s;
}
textarea:focus {
  border-color: #0078d4;
  outline: none;
}
.emoji-btn {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  transition: color 0.2s;
}
.emoji-btn:hover {
  color: #0078d4;
}
.emoji-picker {
  position: absolute;
  bottom: 2.5rem;
  right: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  z-index: 10;
  max-width: 300px;
}
.emoji {
  font-size: 1.3em;
  cursor: pointer;
  padding: 0.2em;
  border-radius: 6px;
  transition: background 0.2s;
}
.emoji:hover {
  background: #f3f3f3;
}
.send-btn {
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  border: none;
  background: linear-gradient(90deg, #0078d4 60%, #00c6fb 100%);
  color: #fff;
  font-weight: bold;
  font-size: 1em;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 120, 212, 0.08);
  transition: background 0.2s;
}
.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
/* Message bubbles */
/* Grouped message style Teams-like */
.message-group {
  display: flex;
  align-items: flex-end;
  margin-bottom: 1.2em;
}
.message-group.mine {
  flex-direction: row-reverse;
}
.avatar {
  width: 36px;
  height: 36px;
  background: #e3e6f0;
  color: #0078d4;
  font-weight: bold;
  font-size: 1.1em;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.7em;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}
.bubbles {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}
.bubble {
  max-width: 420px;
  padding: 0.7em 1em;
  border-radius: 18px;
  background: #f3f3f3;
  color: #222;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  margin-bottom: 0.2em;
  word-break: break-word;
  font-size: 1.08em;
  position: relative;
}
.message-group.mine .bubble {
  background: #e6f0fa;
  color: #222;
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 18px;
  border-top-right-radius: 18px;
  border-top-left-radius: 18px;
  align-self: flex-end;
}
.message-group.mine .bubble:last-child {
  background: #d0e7ff;
  color: #222;
}
.message-group.other .bubble {
  background: #f3f3f3;
  color: #222;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 18px;
  border-top-right-radius: 18px;
  border-top-left-radius: 18px;
  align-self: flex-start;
}
.meta {
  font-size: 0.95em;
  color: #888;
  margin-bottom: 0.2em;
  display: flex;
  align-items: center;
  gap: 0.7em;
}
.author {
  font-weight: bold;
}
.date {
  font-size: 0.95em;
  color: #888;
}
</style>
