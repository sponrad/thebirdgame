using UnityEngine;
using System.Collections;

public class SkySceneControl : MonoBehaviour {

	public GameObject enemy;
	public GameObject cloud;
	public GameObject balloon;
	public GameObject plane;

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
			
		Invoke ("spawnEnemy", Random.Range(0.1f, 1f));

		spawnBalloon ();
	}
	
	// Update is called once per frame
	void Update () {
		//TODO: spawn a cloud every now and then at the left side of hte screen, moving toward screen

		//follow player
		//Camera.main.transform.position = new Vector3 (plane.transform.position.x, plane.transform.position.y, Camera.main.transform.position.z);
	}

	void spawnEnemy(){
		Vector3 spawnLocation = spawnLocations[Random.Range(0, spawnLocations.Length)];
		
		Instantiate(enemy, spawnLocation, Quaternion.identity);

		Invoke ("spawnEnemy", Random.Range(0.8f, 3f));
	}

	void spawnBalloon(){
		Vector3 spawnLocation = new Vector3 (Random.Range (levelBounds.min.x, levelBounds.max.x), Random.Range (levelBounds.min.y, levelBounds.max.y), 1f);
		Instantiate(balloon, spawnLocation, Quaternion.identity);

		Invoke ("spawnBalloon", Random.Range (2.5f, 5f));
	}
		
}
