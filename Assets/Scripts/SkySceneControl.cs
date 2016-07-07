using UnityEngine;
using System.Collections;

public class SkySceneControl : MonoBehaviour {

	public GameObject enemy;
	public GameObject cloud;
	public GameObject balloon;

	private Vector3[] spawnLocations;


	// Use this for initialization
	void Start () {
		spawnLocations = new [] { 
			new Vector3(0f,0f,1f),
			new Vector3(0f,(float)Screen.height,1f),
			new Vector3((float)Screen.width,0f,1f),
			new Vector3((float)Screen.width,(float)Screen.height,1f)
		};

		//spawn some clouds

		Invoke ("spawnEnemy", Random.Range(0.1f, 1f));

		spawnBalloon ();
	}
	
	// Update is called once per frame
	void Update () {
		//spawn a cloud every now and then at the left side of hte screen, moving toward screen

		//spawn balloons every now and then
	}

	void spawnEnemy(){
		Vector3 spawnLocation = spawnLocations[Random.Range(0, spawnLocations.Length)];
		
		Instantiate(enemy, Camera.main.ScreenToWorldPoint(spawnLocation), Quaternion.identity);

		Invoke ("spawnEnemy", Random.Range(0.8f, 3f));
	}

	void spawnBalloon(){
		Vector3 spawnLocation = new Vector3 (Random.Range (0f, Screen.width), Random.Range (0f, Screen.height), 1f);
		Instantiate(balloon, Camera.main.ScreenToWorldPoint(spawnLocation), Quaternion.identity);

		Invoke ("spawnBalloon", Random.Range (2.5f, 5f));
	}
		
}
