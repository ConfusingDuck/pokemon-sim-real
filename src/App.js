import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [isOpening, setIsOpening] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardSets, setCardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // New state variables for card reveal
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAllCards, setShowAllCards] = useState(false);
  
  const API_KEY = process.env.REACT_APP_POKEMON_TCG_API_KEY;
  const API_BASE = 'https://api.pokemontcg.io/v2';

  // Log the API key (remove in production)
  console.log('API Key:', API_KEY);

  useEffect(() => {
    // Fetch available card sets when component mounts
    fetchCardSets();
  }, []);

  const fetchCardSets = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE}/sets`, {
        headers: { 
          'X-Api-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      console.log('Sets response:', response.data);
      // Sort sets by release date, newest first
      const sortedSets = response.data.data.sort((a, b) => 
        new Date(b.releaseDate) - new Date(a.releaseDate)
      );
      setCardSets(sortedSets);
      setSelectedSet(sortedSets[0]); // Select newest set by default
    } catch (error) {
      console.error('Error details:', error.response || error);
      setError(error.response?.data?.message || error.message);
    }
  };

  const getRandomCardsFromRarity = async (rarity, count) => {
    try {
      const response = await axios.get(`${API_BASE}/cards`, {
        headers: { 'X-Api-Key': API_KEY },
        params: {
          q: `set.id:${selectedSet.id} rarity:"${rarity}"`,
          pageSize: 100
        }
      });
      
      const cards = response.data.data;
      const selectedCards = [];
      
      for (let i = 0; i < count; i++) {
        if (cards.length > 0) {
          const randomIndex = Math.floor(Math.random() * cards.length);
          selectedCards.push(cards[randomIndex]);
          cards.splice(randomIndex, 1); // Remove selected card to avoid duplicates
        }
      }
      
      return selectedCards;
    } catch (error) {
      console.error(`Error fetching ${rarity} cards:`, error);
      return [];
    }
  };

  const openPack = async () => {
    if (!selectedSet) return;
    
    setIsLoading(true);
    
    try {
      // Typical pack distribution
      const commonCards = await getRandomCardsFromRarity('Common', 6);
      const uncommonCards = await getRandomCardsFromRarity('Uncommon', 3);
      
      // Rare slot (with chance for better rarities)
      const rareSlotRandom = Math.random();
      let rareSlotCards = [];
      
      if (rareSlotRandom < 0.02) { // 2% chance for Secret Rare
        rareSlotCards = await getRandomCardsFromRarity('Secret Rare', 1);
      } else if (rareSlotRandom < 0.15) { // 13% chance for Ultra Rare
        rareSlotCards = await getRandomCardsFromRarity('Rare Ultra', 1);
      } else { // 85% chance for regular Rare
        rareSlotCards = await getRandomCardsFromRarity('Rare', 1);
      }

      const allCards = [
        ...commonCards,
        ...uncommonCards,
        ...rareSlotCards
      ].map(card => ({
        ...card,
        uniqueId: `${card.id}-${Math.random()}`
      }));

      setCards(allCards);
      setIsOpening(true);
      
      // Reset the reveal flow when opening a new pack
      setCurrentCardIndex(0);
      setShowAllCards(false);
    } catch (error) {
      console.error('Error opening pack:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setShowAllCards(true);
    }
  };

  const resetPack = () => {
    setIsOpening(false);
    setCards([]);
    setCurrentCardIndex(0);
    setShowAllCards(false);
  };

  // Handle swipe gestures
  useEffect(() => {
    let touchStartX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      // If swiped left with enough distance
      if (diff > 50) {
        showNextCard();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentCardIndex, cards.length]);

  return (
    <div className="app">
      <h1>Pokémon Pack Simulator</h1>
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {/* Set selector */}
      <div className="set-selector">
        <div className="select-wrapper">
          <select 
            value={selectedSet?.id || ''} 
            onChange={(e) => setSelectedSet(cardSets.find(set => set.id === e.target.value))}
            className="set-select"
          >
            <option value="" disabled>Select a Pokémon Set</option>
            {cardSets.map(set => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.series})
              </option>
            ))}
          </select>
          <div className="select-arrow">▼</div>
        </div>
      </div>

      {!isOpening ? (
        <div className="pack-container">
          <div className="pack" onClick={openPack}>
            {selectedSet && (
              <>
                <img 
                  src={selectedSet.images.logo} 
                  alt={selectedSet.name} 
                  className="pack-image"
                />
                <div className="pack-info">
                  <h3>{selectedSet.name}</h3>
                  <p>{selectedSet.series}</p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {!showAllCards ? (
            <div className="card-reveal-container">
              <div className="current-card-display">
                <div className="card-count">
                  Card {currentCardIndex + 1} of {cards.length}
                </div>
                
                {cards[currentCardIndex] && (
                  <div className="single-card" onClick={showNextCard}>
                    <div className="card-flip-container">
                      <img 
                        src={cards[currentCardIndex].images.large} 
                        alt={cards[currentCardIndex].name} 
                        className="single-card-image" 
                      />
                    </div>
                    
                    <div className="card-info">
                      <h3>{cards[currentCardIndex].name}</h3>
                      <p className={`rarity ${cards[currentCardIndex].rarity.toLowerCase().replace(/\s+/g, '-')}`}>
                        {cards[currentCardIndex].rarity}
                      </p>
                    </div>
                    
                    <div className="card-instruction">
                      Click or swipe left to reveal next card
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="all-cards-summary">
              <h2>Your Complete Pack</h2>
              <div className="cards-container">
                {cards.map((card, index) => (
                  <div 
                    key={card.uniqueId} 
                    className="card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <img 
                      src={card.images.large} 
                      alt={card.name} 
                      className="card-image" 
                    />
                    <div className="card-info">
                      <h3>{card.name}</h3>
                      <p className={`rarity ${card.rarity.toLowerCase().replace(/\s+/g, '-')}`}>
                        {card.rarity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="reset-button" 
                onClick={resetPack}
                disabled={isLoading}
              >
                Open Another Pack
              </button>
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Opening pack...</p>
        </div>
      )}
    </div>
  );
}

export default App;
