using UnityEngine;
using System.Collections;
using UnityEngine.UI;

public class SkySceneControl : MonoBehaviour {

	public GameObject enemy;
	public GameObject cloud;
	public GameObject balloon;
	public GameObject plane;
	public Text scoreText;
	public Text scoreMultiplierText;

	public Bounds levelBounds;

	private Vector3[] spawnLocations;
	public float spawnBuffer = 5f;


	// Use this for initialization
	void Start () {
		spawnLocations = new [] { 
			new Vector3(levelBounds.min.x + spawnBuffer, levelBounds.min.y + spawnBuffer, 1f),
			new Vector3(levelBounds.min.x + spawnBuffer,levelBounds.max.y - spawnBuffer, 1f),
			new Vector3(levelBounds.max.x - spawnBuffer, levelBounds.min.y + spawnBuffer, 1f),
			new Vector3(levelBounds.max.x - spawnBuffer, levelBounds.max.y - spawnBuffer, 1f)
		};
			
		Globals.scoreMultiplier = 1;
		Globals.score = 0;
		Globals.inGame = true;

		Invoke ("spawnEnemy", 1f);

		spawnBalloon ();

	}
	
	// Update is called once per frame
	void Update () {
		scoreText.text = Globals.score.ToString ();
		scoreMultiplierText.text = "x " + Globals.scoreMultiplier.ToString ();
	}

	void spawnEnemy(){
		if (Globals.inGame) {
			int spawnCount = Mathf.FloorToInt ( (Globals.scoreMultiplier - 1) / (5 * Mathf.Log (Globals.scoreMultiplier)) );
			spawnCount = Random.Range(1, Random.Range (1, spawnCount*2) );
			Debug.Log (spawnCount);
			Vector3 spawnLocation = spawnLocations[Random.Range(0, spawnLocations.Length)];
			for (int i = 0; i < spawnCount; i++) {
				spawnLocation.x += Random.Range (-0.5f, 0.5f);
				spawnLocation.y += Random.Range (-0.5f, 0.5f);
				Instantiate (enemy, spawnLocation, Quaternion.identity);
			}
			Invoke ("spawnEnemy", 1.5f);
		}
	}

	void spawnBalloon(){
		if (Globals.inGame) {
			Vector3 spawnLocation = new Vector3 (Random.Range (levelBounds.min.x, levelBounds.max.x), Random.Range (levelBounds.min.y, levelBounds.max.y), 1f);
			Instantiate(balloon, spawnLocation, Quaternion.identity);
			Invoke ("spawnBalloon", Random.Range (2.5f, 5f));
		}
	}
		
}
