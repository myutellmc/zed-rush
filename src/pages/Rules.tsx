import React from "react";
import { Link } from "react-router-dom";

export default function Rules() {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto bg-white/90 dark:bg-gray-800/90 rounded-2xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            Game Rules
          </h1>
          <Link 
            to="/"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Game
          </Link>
        </div>

        {/* How to Play Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">How to Play</h2>
          <div className="space-y-4 text-lg text-gray-700 dark:text-gray-300">
            
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border-l-4 border-green-500">
              <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">1. Teams</h3>
              <p>Split into two or more teams with at least 2 players each.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-2">2. Turn Structure</h3>
              <p>One player from the active team describes words while teammates guess. Other teams watch the timer and ensure rules are followed.</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border-l-4 border-orange-500">
              <h3 className="font-bold text-orange-700 dark:text-orange-300 mb-2">3. Time Limit</h3>
              <p>You have exactly 30 seconds to get your team to guess as many words as possible.</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border-l-4 border-red-500">
              <h3 className="font-bold text-red-700 dark:text-red-300 mb-2">4. Describing Rules</h3>
              <div className="space-y-2">
                <p>• You <strong>CANNOT</strong> say the word itself or any part of it</p>
                <p>• You <strong>CANNOT</strong> use rhyming words or "sounds like" clues</p>
                <p>• You <strong>CANNOT</strong> use letter spelling or number of syllables</p>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border-l-4 border-purple-500">
              <h3 className="font-bold text-purple-700 dark:text-purple-300 mb-2">5. No Translating</h3>
              <p>You <strong>CANNOT</strong> translate the word. Saying an English word's vernacular version (Nyanja, Bemba, Tonga or any other local language), or a vernacular word's English version, counts as saying the word itself. For example, for <em>Nshima</em> you can't say "ubwali".</p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border-l-4 border-yellow-500">
              <h3 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2">6. Skipping</h3>
              <p>If a word is too difficult, you can say "PASS" to skip it, but you lose that point.</p>
            </div>

            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-lg border-l-4 border-teal-500">
              <h3 className="font-bold text-teal-700 dark:text-teal-300 mb-2">7. Body Language</h3>
              <p>You can use hand gestures and body movements, but no pointing at objects in the room.</p>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border-l-4 border-indigo-500">
              <h3 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2">8. Scoring</h3>
              <p>One point for each word guessed correctly. The team with the most points after all rounds wins.</p>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/30 p-4 rounded-lg border-l-4 border-pink-500">
              <h3 className="font-bold text-pink-700 dark:text-pink-300 mb-2">9. Fair Play</h3>
              <p>If other teams think a rule was broken, they can challenge immediately. The describing team loses that point if the challenge is valid.</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border-l-4 border-gray-500">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">10. Winning</h3>
              <p>Play continues until each team has had equal turns, then count up the total points to determine the winner.</p>
            </div>

          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/50 dark:to-blue-900/50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Quick Tips for Success</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Think of categories, synonyms, and descriptions</li>
            <li>Use your hands to gesture (but don't point at things)</li>
            <li>Stay calm when time is running out</li>
            <li>Practice with your team to develop communication</li>
            <li>Remember: if you're not sure about a rule, ask before starting!</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Have fun and play fair!
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
